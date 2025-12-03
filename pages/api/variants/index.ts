import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { toNullableNumber } from "../products";

const prisma = new PrismaClient();

const toNullableDate = (value: unknown) => {
  if (!value) {
    return null;
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
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
    case "POST":
      try {
        const {
          productId,
          name,
          sku,
          price,
          quantity,
          size,
          color,
          material,
          weight,
          dimensions,
          attributes,
          isActive = true,
          imageUrl,
          barcode,
          costPrice,
          sellingPrice,
          minStock,
          maxStock,
          reorderPoint,
          expiryDate,
        } = req.body;

        // Verify the product belongs to the user
        const product = await prisma.product.findFirst({
          where: { id: productId, userId },
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if SKU already exists
        const existingVariant = await prisma.productVariant.findUnique({
          where: { sku },
        });

        if (existingVariant) {
          return res.status(400).json({ error: "Variant SKU must be unique" });
        }

        if (barcode) {
          const existingBarcode = await prisma.productVariant.findUnique({
            where: { barcode },
          });

          if (existingBarcode) {
            return res.status(400).json({ error: "Variant barcode must be unique" });
          }
        }

        // Create the variant - quantity starts at 0, stock comes from purchase orders
        const variant = await prisma.productVariant.create({
          data: {
            productId,
            name,
            sku,
            price: toNullableNumber(sellingPrice) || toNullableNumber(price) || 0,
            quantity: 0, // Stock is updated via purchase order receipts
            size,
            color,
            material,
            weight,
            dimensions,
            attributes: attributes || {},
            isActive,
            imageUrl,
            barcode,
            costPrice: toNullableNumber(costPrice),
            minStock: toNullableNumber(minStock),
            maxStock: toNullableNumber(maxStock),
            reorderPoint: toNullableNumber(reorderPoint),
            expiryDate: toNullableDate(expiryDate),
          },
        });

        // Update product to indicate it has variants
        await prisma.product.update({
          where: { id: productId },
          data: { hasVariants: true },
        });

        res.status(201).json(variant);
      } catch (error) {
        console.error("Error creating variant:", error);
        res.status(500).json({ error: "Failed to create variant" });
      }
      break;

    case "GET":
      try {
        const { productId } = req.query;

        let variants;
        if (productId) {
          // Get variants for a specific product
          const product = await prisma.product.findFirst({
            where: { id: productId as string, userId },
          });

          if (!product) {
            return res.status(404).json({ error: "Product not found" });
          }

          variants = await prisma.productVariant.findMany({
            where: { productId: productId as string },
            orderBy: { createdAt: "desc" },
          });
        } else {
          // Get all variants for all user's products
          const userProducts = await prisma.product.findMany({
            where: { userId },
            select: { id: true },
          });

          const productIds = userProducts.map((p) => p.id);

          variants = await prisma.productVariant.findMany({
            where: { productId: { in: productIds } },
            orderBy: { createdAt: "desc" },
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          });
        }

        res.status(200).json(variants);
      } catch (error) {
        console.error("Error fetching variants:", error);
        res.status(500).json({ error: "Failed to fetch variants" });
      }
      break;

    case "PUT":
      try {
        const {
          id,
          name,
          sku,
          price,
          sellingPrice,
          size,
          color,
          material,
          weight,
          dimensions,
          attributes,
          isActive,
          imageUrl,
          barcode,
          costPrice,
          minStock,
          maxStock,
          reorderPoint,
          expiryDate,
        } = req.body;

        // Verify the variant exists and belongs to user's product
        const existingVariant = await prisma.productVariant.findUnique({
          where: { id },
          include: { product: true },
        });

        if (!existingVariant || existingVariant.product.userId !== userId) {
          return res.status(404).json({ error: "Variant not found" });
        }

        // Check if new SKU conflicts with existing variants
        if (sku !== existingVariant.sku) {
          const skuConflict = await prisma.productVariant.findUnique({
            where: { sku },
          });

          if (skuConflict) {
            return res.status(400).json({ error: "Variant SKU must be unique" });
          }
        }

        if (barcode && barcode !== existingVariant.barcode) {
          const barcodeConflict = await prisma.productVariant.findUnique({
            where: { barcode },
          });

          if (barcodeConflict) {
            return res.status(400).json({ error: "Variant barcode must be unique" });
          }
        }

        // Use sellingPrice if provided, otherwise use price field
        const priceValue = toNullableNumber(sellingPrice) ?? toNullableNumber(price);

        // Update the variant - quantity is NOT updated here, only via purchase orders
        const updatedVariant = await prisma.productVariant.update({
          where: { id },
          data: {
            name,
            sku,
            price: priceValue ?? existingVariant.price,
            // quantity is NOT updated - managed via purchase order receipts
            size,
            color,
            material,
            weight,
            dimensions,
            attributes: attributes || {},
            isActive,
            imageUrl,
            barcode: barcode || null,
            costPrice: toNullableNumber(costPrice),
            minStock: toNullableNumber(minStock),
            maxStock: toNullableNumber(maxStock),
            reorderPoint: toNullableNumber(reorderPoint),
            expiryDate: toNullableDate(expiryDate),
          },
        });

        res.status(200).json(updatedVariant);
      } catch (error) {
        console.error("Error updating variant:", error);
        res.status(500).json({ error: "Failed to update variant" });
      }
      break;

    case "DELETE":
      try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
          return res.status(400).json({ error: "Variant ID is required" });
        }

        // Verify the variant exists and belongs to user's product
        const variant = await prisma.productVariant.findUnique({
          where: { id },
          include: { product: true },
        });

        if (!variant || variant.product.userId !== userId) {
          return res.status(404).json({ error: "Variant not found" });
        }

        // Delete the variant
        await prisma.productVariant.delete({
          where: { id },
        });

        // Check if product still has variants
        const remainingVariants = await prisma.productVariant.count({
          where: { productId: variant.productId },
        });

        // Update product hasVariants flag if no variants remain
        if (remainingVariants === 0) {
          await prisma.product.update({
            where: { id: variant.productId },
            data: { hasVariants: false },
          });
        }

        res.status(200).json({ message: "Variant deleted successfully" });
      } catch (error) {
        console.error("Error deleting variant:", error);
        res.status(500).json({ error: "Failed to delete variant" });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
