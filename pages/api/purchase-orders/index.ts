import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { auditCreate, createAuditLog } from "@/utils/auditLogger";
import { prisma } from "@/prisma/singleton";

const serializePurchaseOrderItem = (item: any) => ({
  id: item.id,
  productId: item.productId,
  productName: item.product?.name ?? "Unknown",
  productVariantId: item.productVariantId,
  variantName: item.variant?.name ?? null,
  orderedQuantity: item.orderedQuantity,
  receivedQuantity: item.receivedQuantity,
  costPerUnit: item.costPerUnit ?? 0,
  lineTotal: item.lineTotal ?? 0,
});

const serializePurchaseOrder = (po: any) => ({
  id: po.id,
  poNumber: po.poNumber,
  supplierId: po.supplierId,
  supplierName: po.supplier?.name ?? "Unknown",
  status: po.status,
  orderedAt: po.orderedAt ? po.orderedAt.toISOString() : null,
  expectedAt: po.expectedAt ? po.expectedAt.toISOString() : null,
  totalCost: po.totalCost ?? 0,
  notes: po.notes ?? "",
  createdAt: po.createdAt.toISOString(),
  items: po.items?.map(serializePurchaseOrderItem) ?? [],
});

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
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
        const canRead = await hasPermission(userId, "purchaseOrders", "read");
        if (!canRead) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to view purchase orders" });
        }
        const purchaseOrders = await prisma.purchaseOrder.findMany({
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        return res
          .status(200)
          .json(purchaseOrders.map((po) => serializePurchaseOrder(po)));
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return res.status(500).json({ error: "Failed to fetch purchase orders" });
      }
    }

    case "POST": {
      try {
        const canCreate = await hasPermission(userId, "purchaseOrders", "create");
        if (!canCreate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to create purchase orders" });
        }
        const {
          orderNumber,
          supplierId,
          orderDate,
          expectedDate,
          status,
          totalCost,
          notes,
          items,
        } = req.body;

        if (!orderNumber || !supplierId) {
          return res
            .status(400)
            .json({ error: "Order number and supplier are required." });
        }

        // Calculate total from items if not provided
        let calculatedTotal = parseNumber(totalCost);
        if (items && Array.isArray(items) && items.length > 0) {
          const itemsTotal = items.reduce((sum: number, item: any) => {
            const qty = parseNumber(item.orderedQuantity) ?? 0;
            const cost = parseNumber(item.costPerUnit) ?? 0;
            return sum + qty * cost;
          }, 0);
          if (!calculatedTotal) {
            calculatedTotal = itemsTotal;
          }
        }

        const created = await prisma.purchaseOrder.create({
          data: {
            poNumber: orderNumber,
            supplierId,
            userId,
            status: status || "draft",
            orderedAt: parseDate(orderDate) || undefined,
            expectedAt: parseDate(expectedDate) || undefined,
            totalCost: calculatedTotal ?? undefined,
            notes: notes || undefined,
            items:
              items && Array.isArray(items) && items.length > 0
                ? {
                    create: items.map((item: any) => {
                      const qty = parseNumber(item.orderedQuantity) ?? 1;
                      const cost = parseNumber(item.costPerUnit) ?? 0;
                      return {
                        productId: item.productId || null,
                        productVariantId: item.productVariantId || null,
                        orderedQuantity: qty,
                        receivedQuantity: 0,
                        costPerUnit: cost,
                        lineTotal: qty * cost,
                      };
                    }),
                  }
                : undefined,
          },
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        });

        // Audit log the purchase order creation
        await auditCreate(
          "PurchaseOrder",
          {
            id: created.id,
            name: created.poNumber || `PO-${created.id.slice(0, 8)}`,
            poNumber: created.poNumber,
            supplierId: created.supplierId,
            totalCost: created.totalCost,
            itemCount: items?.length || 0,
          },
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        return res.status(201).json(serializePurchaseOrder(created));
      } catch (error: any) {
        console.error("Error creating purchase order:", error);
        
        // Audit log failed creation
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "CREATE",
            entityType: "PurchaseOrder",
            status: "error",
            errorMessage: error.code === "P2002" ? "Purchase order number must be unique" : error.message,
            metadata: {
              orderNumber: req.body.orderNumber,
              supplierId: req.body.supplierId,
            },
          },
          req
        );
        
        if (error.code === "P2002") {
          return res
            .status(400)
            .json({ error: "Purchase order number must be unique." });
        }
        return res.status(500).json({ error: "Failed to create purchase order" });
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
