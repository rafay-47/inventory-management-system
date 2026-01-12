import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import {
  buildProductResponse,
  normalizeId,
  productInclude,
  toNullableNumber,
} from "./index";
import { hasPermission } from "@/middleware/roleMiddleware";

const prisma = new PrismaClient();

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

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  switch (method) {
    case "GET":
      try {
        const canRead = await hasPermission(userId, "products", "read");
        if (!canRead) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to view products" });
        }
        const product = await prisma.product.findUnique({
          where: { id },
          include: productInclude,
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        res.status(200).json(buildProductResponse(product));
      } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ error: "Failed to fetch product" });
      }
      break;

    case "PUT":
      try {
        const canUpdate = await hasPermission(userId, "products", "update");
        if (!canUpdate) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to update products" });
        }
        const {
          name,
          sku,
          description,
          status,
          categoryId,
          imageUrl,
          minStock,
          maxStock,
          reorderPoint,
          reorderQuantity,
          defaultWarehouseId,
        } = req.body;

        // Check if product exists
        const existingProduct = await prisma.product.findUnique({
          where: { id },
        });

        if (!existingProduct) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if SKU is being changed and if new SKU already exists
        if (sku !== existingProduct.sku) {
          const skuExists = await prisma.product.findUnique({
            where: { sku },
          });
          if (skuExists) {
            return res.status(400).json({ error: "SKU already exists" });
          }
        }

        await prisma.product.update({
          where: { id },
          data: {
            name,
            sku,
            description,
            status,
            categoryId,
            imageUrl,
            minStock: toNullableNumber(minStock),
            maxStock: toNullableNumber(maxStock),
            reorderPoint: toNullableNumber(reorderPoint),
            reorderQuantity: toNullableNumber(reorderQuantity),
            defaultWarehouseId: normalizeId(defaultWarehouseId),
          },
        });

        const updatedProduct = await prisma.product.findUnique({
          where: { id },
          include: productInclude,
        });

        res.status(200).json(buildProductResponse(updatedProduct));
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Failed to update product" });
      }
      break;

    case "DELETE":
      try {
        const canDelete = await hasPermission(userId, "products", "delete");
        if (!canDelete) {
          return res.status(403).json({ error: "Forbidden", message: "You don't have permission to delete products" });
        }
        // Check if product exists
        const productToDelete = await prisma.product.findUnique({
          where: { id },
          include: {
            variants: true,
          },
        });

        if (!productToDelete) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Delete all variants first
        if (productToDelete.variants.length > 0) {
          await prisma.productVariant.deleteMany({
            where: { productId: id },
          });
        }

        // Delete product
        await prisma.product.delete({
          where: { id },
        });

        res.status(200).json({ message: "Product deleted successfully" });
      } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Failed to delete product" });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      res.status(405).json({ error: `Method ${method} not allowed` });
  }
}
