import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { prisma } from "@/prisma/singleton";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method, query } = req;
  const { id } = query;
  const userId = session.id;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid invoice ID" });
  }

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const canRead = await hasPermission(userId, "sales", "read");
    if (!canRead) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "You don't have permission to download invoices" 
      });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            orderItems: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Generate HTML invoice (same as preview)
    const html = generateInvoiceHTML(invoice);

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return res.status(500).json({ error: "Failed to generate invoice PDF" });
  }
}

function generateInvoiceHTML(invoice: any) {
  const order = invoice.order;
  const customer = order?.customer;
  const items = order?.orderItems || [];

  const formatCurrency = (amount: number) => 
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px 20px;
      background: white;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 60px;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #007bff;
    }
    .company-info h1 {
      font-size: 28px;
      color: #007bff;
      margin-bottom: 5px;
    }
    .company-info p {
      color: #666;
      font-size: 14px;
    }
    .invoice-details {
      text-align: right;
    }
    .invoice-details h2 {
      font-size: 24px;
      color: #333;
      margin-bottom: 10px;
    }
    .invoice-details p {
      font-size: 14px;
      margin: 5px 0;
    }
    .invoice-details .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 10px;
    }
    .status.issued { background: #d1ecf1; color: #0c5460; }
    .status.paid { background: #d4edda; color: #155724; }
    .status.overdue { background: #f8d7da; color: #721c24; }
    .status.cancelled { background: #f5f5f5; color: #666; }
    .billing-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 40px 0;
    }
    .billing-section h3 {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .billing-section p {
      font-size: 14px;
      margin: 3px 0;
    }
    .billing-section .name {
      font-weight: 600;
      font-size: 16px;
      color: #333;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 40px 0;
    }
    thead {
      background: #f8f9fa;
    }
    th {
      text-align: left;
      padding: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #dee2e6;
    }
    th.text-right { text-align: right; }
    td {
      padding: 15px 12px;
      border-bottom: 1px solid #dee2e6;
      font-size: 14px;
    }
    td.text-right { text-align: right; }
    .item-name {
      font-weight: 500;
      color: #333;
    }
    .item-description {
      font-size: 13px;
      color: #666;
      margin-top: 3px;
    }
    .totals {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
    }
    .totals-row.subtotal {
      border-top: 1px solid #dee2e6;
    }
    .totals-row.total {
      border-top: 2px solid #333;
      font-size: 18px;
      font-weight: 600;
      padding-top: 15px;
      margin-top: 5px;
    }
    .notes {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #007bff;
    }
    .notes h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .notes p {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .invoice-container {
        box-shadow: none;
        padding: 40px;
      }
    }
    @media (max-width: 768px) {
      .invoice-container {
        padding: 30px 20px;
      }
      .invoice-header {
        flex-direction: column;
        gap: 20px;
      }
      .invoice-details {
        text-align: left;
      }
      .billing-info {
        grid-template-columns: 1fr;
        gap: 30px;
      }
      table {
        font-size: 12px;
      }
      th, td {
        padding: 8px 6px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <div class="company-info">
        <h1>Stock Inventory System</h1>
        <p>Inventory Management Solutions</p>
        <p>Email: contact@stockinventory.com</p>
        <p>Phone: (555) 123-4567</p>
      </div>
      <div class="invoice-details">
        <h2>INVOICE</h2>
        <p><strong>Invoice #:</strong> ${invoice.invoiceNumber || "—"}</p>
        <p><strong>Order #:</strong> ${order?.orderNumber || "—"}</p>
        <p><strong>Issue Date:</strong> ${formatDate(invoice.issuedAt)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        <span class="status ${invoice.status || "issued"}">${invoice.status || "issued"}</span>
      </div>
    </div>

    <div class="billing-info">
      <div class="billing-section">
        <h3>Bill To</h3>
        <p class="name">${customer?.name || "—"}</p>
        ${customer?.company ? `<p>${customer.company}</p>` : ""}
        ${customer?.email ? `<p>${customer.email}</p>` : ""}
        ${customer?.phone ? `<p>${customer.phone}</p>` : ""}
        ${customer?.address ? `<p>${customer.address}</p>` : ""}
        ${customer?.city || customer?.state || customer?.postalCode ? 
          `<p>${[customer?.city, customer?.state, customer?.postalCode].filter(Boolean).join(", ")}</p>` : ""}
      </div>
      <div class="billing-section">
        <h3>Invoice Details</h3>
        <p><strong>Payment Terms:</strong> Net 30</p>
        <p><strong>Currency:</strong> ${invoice.currency || "USD"}</p>
        ${order?.source ? `<p><strong>Sales Channel:</strong> ${order.source}</p>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item: any) => `
          <tr>
            <td>
              <div class="item-name">${item.product?.name || "Product"}</div>
              ${item.variant ? `<div class="item-description">${item.variant.name}</div>` : ""}
              ${item.product?.sku ? `<div class="item-description">SKU: ${item.product.sku}</div>` : ""}
            </td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice || 0)}</td>
            <td class="text-right">${formatCurrency(item.subtotal || 0)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row subtotal">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>Tax (10%):</span>
          <span>${formatCurrency(tax)}</span>
        </div>
        <div class="totals-row total">
          <span>Total:</span>
          <span>${formatCurrency(total)}</span>
        </div>
      </div>
    </div>

    ${invoice.notes || order?.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${invoice.notes || order?.notes || ""}</p>
    </div>
    ` : ""}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>For questions about this invoice, please contact our billing department.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const config = {
  api: {
    externalResolver: true,
  },
};
