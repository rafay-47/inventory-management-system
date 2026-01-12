import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { auditUpdate, createAuditLog } from "@/utils/auditLogger";

const prisma = new PrismaClient();

/**
 * API endpoint to receive a purchase order and update inventory.
 * When a PO is marked as "Received":
 * 1. Updates PO status and receivedAt timestamp
 * 2. Updates receivedQuantity on each line item
 * 3. Updates variant quantities (adding received stock)
 * 4. Updates variant cost prices from PO line items
 * 5. Creates inventory transactions for audit trail
 * 6. Updates product status based on new stock levels
 */
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

  if (method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Purchase order ID is required" });
  }

  try {
    // Check permission
    const canReceive = await hasPermission(userId, "purchaseOrders", "receive");
    if (!canReceive) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to receive purchase orders",
      });
    }

    // Fetch the purchase order with items
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        supplier: true,
      },
    });

    if (!purchaseOrder) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    if (purchaseOrder.status === "Received" || purchaseOrder.status === "Closed") {
      return res.status(400).json({
        error: "Purchase order has already been received",
      });
    }

    // Process each line item
    const updatedItems = [];
    const inventoryTransactions = [];

    for (const item of purchaseOrder.items) {
      const quantityToReceive = item.orderedQuantity - item.receivedQuantity;

      if (quantityToReceive <= 0) continue;

      // Update variant quantity and cost price if variant exists
      if (item.productVariantId && item.variant) {
        await prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: {
            quantity: {
              increment: quantityToReceive,
            },
            // Update cost price from this PO
            costPrice: item.costPerUnit ?? item.variant.costPrice,
          },
        });

        // Create inventory transaction for audit trail
        inventoryTransactions.push({
          transactionType: "PURCHASE" as const,
          productId: item.productId,
          productVariantId: item.productVariantId,
          userId,
          purchaseOrderId: purchaseOrder.id,
          quantity: quantityToReceive,
          referenceCode: purchaseOrder.poNumber,
          notes: `Received from PO ${purchaseOrder.poNumber}`,
        });
      }

      // Update the line item's received quantity
      await prisma.purchaseOrderItem.update({
        where: { id: item.id },
        data: {
          receivedQuantity: item.orderedQuantity,
        },
      });

      updatedItems.push({
        itemId: item.id,
        productId: item.productId,
        variantId: item.productVariantId,
        quantityReceived: quantityToReceive,
      });
    }

    // Create all inventory transactions
    if (inventoryTransactions.length > 0) {
      await prisma.inventoryTransaction.createMany({
        data: inventoryTransactions,
      });
    }

    // Update purchase order status
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "Received",
        receivedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        supplier: true,
      },
    });

    // Update product statuses based on new stock levels
    const affectedProductIds = [
      ...new Set(purchaseOrder.items.map((item) => item.productId).filter(Boolean)),
    ] as string[];

    for (const productId of affectedProductIds) {
      // Get all variants for this product
      const variants = await prisma.productVariant.findMany({
        where: { productId, isActive: true },
      });

      const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);

      // Get product's reorder point
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { reorderPoint: true, minStock: true },
      });

      const threshold = product?.reorderPoint ?? product?.minStock ?? 0;

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

    // Audit log the receive action
    await auditUpdate(
      "PurchaseOrder",
      updatedPO.id,
      updatedPO.poNumber || `PO-${updatedPO.id.slice(0, 8)}`,
      { status: purchaseOrder.status, receivedAt: null },
      { status: "Received", receivedAt: updatedPO.receivedAt },
      {
        userId: session.id,
        userName: session.name,
        userEmail: session.email,
      },
      req
    );

    return res.status(200).json({
      success: true,
      message: `Purchase order ${updatedPO.poNumber} received successfully`,
      purchaseOrder: {
        id: updatedPO.id,
        poNumber: updatedPO.poNumber,
        status: updatedPO.status,
        receivedAt: updatedPO.receivedAt?.toISOString(),
      },
      itemsReceived: updatedItems.length,
      transactionsCreated: inventoryTransactions.length,
    });
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    
    // Audit log the failed operation
    await createAuditLog(
      {
        userId: session.id,
        userName: session.name,
        userEmail: session.email,
        action: "UPDATE",
        entityType: "PurchaseOrder",
        entityId: id as string,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Failed to receive purchase order",
      },
      req
    );
    
    return res.status(500).json({ error: "Failed to receive purchase order" });
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
