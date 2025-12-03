import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

const serializeOrder = (order: any) => {
  const firstItem = order.orderItems?.[0];
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer?.name ?? "Unknown",
    customerEmail: order.customer?.email ?? "",
    productName:
      firstItem?.product?.name || firstItem?.noteProductName || "Custom product",
    productId: firstItem?.productId || null,
    saleDate: order.orderedAt ? order.orderedAt.toISOString() : null,
    channel: order.source || "",
    quantity: firstItem?.quantity ?? 0,
    totalAmount: order.totalAmount ?? 0,
    notes: order.notes || "",
  };
};

const parseNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDate = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const generateOrderNumber = () => {
  const now = new Date();
  return `SO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
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
        const orders = await prisma.order.findMany({
          where: {
            customer: {
              userId,
            },
          },
          include: {
            customer: true,
            orderItems: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { orderedAt: "desc" },
        });

        return res.status(200).json(orders.map((order) => serializeOrder(order)));
      } catch (error) {
        console.error("Error fetching sales orders:", error);
        return res.status(500).json({ error: "Failed to fetch sales transactions" });
      }
    }

    case "POST": {
      try {
        const {
          customerName,
          customerEmail,
          customerCompany,
          customerPhone,
          productId,
          productVariantId,
          productName,
          saleDate,
          channel,
          quantity = 1,
          totalAmount,
          notes,
        } = req.body;

        if (!customerName || !productId || !totalAmount) {
          return res.status(400).json({
            error: "Customer name, product, and total amount are required.",
          });
        }

        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: { variants: true },
        });

        if (!product || product.userId !== userId) {
          return res.status(404).json({ error: "Product not found" });
        }

        const qty = Number(quantity) > 0 ? Number(quantity) : 1;

        // Check stock availability
        let variantToUpdate = null;
        if (productVariantId) {
          variantToUpdate = product.variants.find(v => v.id === productVariantId);
        } else if (product.variants.length > 0) {
          // Use the first active variant with sufficient stock
          variantToUpdate = product.variants.find(v => v.isActive && v.quantity >= qty);
        }

        if (!variantToUpdate) {
          // Check if any variant has enough stock
          const availableVariant = product.variants.find(v => v.isActive && v.quantity >= qty);
          if (!availableVariant && product.variants.length > 0) {
            return res.status(400).json({ 
              error: "Insufficient stock. Please check inventory levels." 
            });
          }
          variantToUpdate = availableVariant;
        }

        if (variantToUpdate && variantToUpdate.quantity < qty) {
          return res.status(400).json({ 
            error: `Insufficient stock. Only ${variantToUpdate.quantity} units available.` 
          });
        }

        let customer = null;
        if (customerEmail) {
          customer = await prisma.customer.findFirst({
            where: { userId, email: customerEmail },
          });
        }

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              userId,
              name: customerName,
              email: customerEmail || null,
              company: customerCompany || null,
              phone: customerPhone || null,
            },
          });
        } else {
          if (customer.name !== customerName || customer.phone !== customerPhone) {
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: {
                name: customerName,
                phone: customerPhone || customer.phone,
                company: customerCompany || customer.company,
              },
            });
          }
        }

        const total = parseNumber(totalAmount) ?? 0;
        const unitPrice = qty > 0 ? total / qty : total;

        const createdOrder = await prisma.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            customerId: customer.id,
            status: "completed",
            orderedAt: parseDate(saleDate),
            fulfilledAt: parseDate(saleDate),
            totalAmount: total,
            notes: notes || undefined,
            source: channel || "Operations",
            orderItems: {
              create: [
                {
                  productId,
                  productVariantId: variantToUpdate?.id || null,
                  quantity: qty,
                  unitPrice,
                  subtotal: total,
                },
              ],
            },
          },
          include: {
            customer: true,
            orderItems: {
              include: { product: true },
            },
          },
        });

        // Reduce variant stock
        if (variantToUpdate) {
          await prisma.productVariant.update({
            where: { id: variantToUpdate.id },
            data: {
              quantity: {
                decrement: qty,
              },
            },
          });

          // Create inventory transaction for audit trail
          await prisma.inventoryTransaction.create({
            data: {
              transactionType: "SALE",
              productId,
              productVariantId: variantToUpdate.id,
              userId,
              orderId: createdOrder.id,
              quantity: -qty, // Negative for outgoing stock
              referenceCode: createdOrder.orderNumber,
              notes: `Sold to ${customerName}`,
            },
          });

          // Update product status based on new stock levels
          const variants = await prisma.productVariant.findMany({
            where: { productId, isActive: true },
          });

          const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
          const threshold = product.reorderPoint ?? product.minStock ?? 0;

          let newStatus = "Available";
          if (totalQuantity <= 0) {
            newStatus = "Stock Out";
          } else if (threshold > 0 && totalQuantity <= threshold) {
            newStatus = "Stock Low";
          }

          await prisma.product.update({
            where: { id: productId },
            data: { status: newStatus },
          });
        }

        return res.status(201).json(
          serializeOrder({
            ...createdOrder,
            orderItems: createdOrder.orderItems.map((item) => ({
              ...item,
              noteProductName: productName,
            })),
          })
        );
      } catch (error) {
        console.error("Error recording sale:", error);
        return res.status(500).json({ error: "Failed to record sales transaction" });
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
