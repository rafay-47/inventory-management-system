import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { auditCreate } from "@/utils/auditLogger";
import { prisma } from "@/prisma/singleton";

const generateInvoiceNumber = () => {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method } = req;
  const userId = session.id;

  switch (method) {
    case "GET": {
      try {
        const canRead = await hasPermission(userId, "sales", "read");
        if (!canRead) {
          return res.status(403).json({ 
            error: "Forbidden", 
            message: "You don't have permission to view invoices" 
          });
        }

        // Use getUserRoles which is now cached
        const { getUserRoles } = await import("@/middleware/roleMiddleware");
        const userRoles = await getUserRoles(userId);

        const isAdmin = userRoles.includes("admin");
        const isSalesperson = userRoles.includes("salesperson");

        // Optimize with select fields
        const selectFields = {
          id: true,
          invoiceNumber: true,
          orderId: true,
          status: true,
          issuedAt: true,
          dueDate: true,
          totalAmount: true,
          currency: true,
          notes: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerId: true,
              status: true,
              orderedAt: true,
              totalAmount: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              orderItems: {
                select: {
                  id: true,
                  productId: true,
                  productVariantId: true,
                  quantity: true,
                  unitPrice: true,
                  discount: true,
                  subtotal: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                    },
                  },
                  variant: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                    },
                  },
                },
              },
            },
          },
        };

        let invoices;

        if (isSalesperson && !isAdmin) {
          // Salespersons only see invoices for sales they created
          invoices = await prisma.invoice.findMany({
            where: {
              order: {
                transactions: {
                  some: {
                    userId: userId,
                    transactionType: "SALE"
                  }
                }
              }
            },
            select: selectFields,
            orderBy: { issuedAt: "desc" },
            take: 100, // Limit results
          });
        } else {
          // Admins see all invoices
          invoices = await prisma.invoice.findMany({
            select: selectFields,
            orderBy: { issuedAt: "desc" },
            take: 100, // Limit results
          });
        }

        return res.status(200).json(invoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        return res.status(500).json({ error: "Failed to fetch invoices" });
      }
    }

    case "POST": {
      try {
        const canCreate = await hasPermission(userId, "sales", "create");
        if (!canCreate) {
          return res.status(403).json({ 
            error: "Forbidden", 
            message: "You don't have permission to create invoices" 
          });
        }

        const { orderId, dueDate, notes } = req.body;

        if (!orderId) {
          return res.status(400).json({ error: "Order ID is required" });
        }

        // Check if order exists
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            customer: true,
            orderItems: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        // Check if invoice already exists for this order
        const existingInvoice = await prisma.invoice.findFirst({
          where: { orderId },
        });

        if (existingInvoice) {
          return res.status(400).json({ 
            error: "Invoice already exists for this order",
            invoiceId: existingInvoice.id 
          });
        }

        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: generateInvoiceNumber(),
            orderId,
            status: "issued",
            issuedAt: new Date(),
            dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            totalAmount: order.totalAmount,
            currency: "USD",
            notes: notes || undefined,
          },
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

        // Audit log
        await auditCreate(
          "Invoice",
          {
            id: invoice.id,
            name: `Invoice ${invoice.invoiceNumber}`,
            invoiceNumber: invoice.invoiceNumber,
            orderId,
            totalAmount: invoice.totalAmount,
          },
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        return res.status(201).json(invoice);
      } catch (error) {
        console.error("Error creating invoice:", error);
        return res.status(500).json({ error: "Failed to create invoice" });
      }
    }

    default: {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
