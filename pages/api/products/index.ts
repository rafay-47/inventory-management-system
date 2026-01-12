import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { hasPermission } from "@/middleware/roleMiddleware";
import { auditCreate, auditUpdate, auditDelete, createAuditLog } from "@/utils/auditLogger";

const prisma = new PrismaClient();

export const productInclude = {
  variants: true,
  category: true,
  defaultWarehouse: true,
};

export const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const normalizeId = (value: unknown) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value;
};

export const buildProductResponse = (product: any) => {
  const variants = product.variants ?? [];
  const activeVariants = variants.filter((variant: any) => variant.isActive);
  const computedPrice =
    activeVariants.length > 0
      ? Math.min(...activeVariants.map((variant: any) => variant.price))
      : 0;
  const computedQuantity = activeVariants.reduce(
    (sum: number, variant: any) => sum + variant.quantity,
    0
  );

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: computedPrice,
    quantity: computedQuantity,
    status: product.status,
    userId: product.userId,
    categoryId: product.categoryId,
    description: product.description,
    imageUrl: product.imageUrl,
    createdAt:
      product.createdAt instanceof Date
        ? product.createdAt.toISOString()
        : product.createdAt,
    category: product.category?.name || "Unknown",
    hasVariants: product.hasVariants,
    minStock: product.minStock,
    maxStock: product.maxStock,
    reorderPoint: product.reorderPoint,
    reorderQuantity: product.reorderQuantity,
    defaultWarehouseId: product.defaultWarehouseId,
    defaultWarehouseName: product.defaultWarehouse?.name || null,
    variants: variants.map((variant: any) => ({
      id: variant.id,
      productId: variant.productId,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      quantity: variant.quantity,
      size: variant.size,
      color: variant.color,
      material: variant.material,
      weight: variant.weight,
      dimensions: variant.dimensions,
      attributes: variant.attributes,
      imageUrl: variant.imageUrl,
      isActive: variant.isActive,
      barcode: variant.barcode,
      costPrice: variant.costPrice,
      minStock: variant.minStock,
      maxStock: variant.maxStock,
      reorderPoint: variant.reorderPoint,
      expiryDate: variant.expiryDate
        ? variant.expiryDate instanceof Date
          ? variant.expiryDate.toISOString()
          : variant.expiryDate
        : null,
      createdAt:
        variant.createdAt instanceof Date
          ? variant.createdAt.toISOString()
          : variant.createdAt,
      updatedAt:
        variant.updatedAt instanceof Date
          ? variant.updatedAt.toISOString()
          : variant.updatedAt,
    })),
  };
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
        // Check permission
        const canCreate = await hasPermission(userId, "products", "create");
        if (!canCreate) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You don't have permission to create products",
          });
        }

        const {
          name,
          sku,
          status,
          categoryId,
          description,
          imageUrl,
          minStock,
          maxStock,
          reorderPoint,
          reorderQuantity,
          defaultWarehouseId,
        } = req.body;

        const existingProduct = await prisma.product.findUnique({
          where: { sku },
        });

        if (existingProduct) {
          return res.status(400).json({ error: "SKU must be unique" });
        }

        // Products start with "Stock Out" status - quantity is 0 until purchase orders are received
        const createdProduct = await prisma.product.create({
          data: {
            name,
            sku,
            status: status || "Stock Out",
            userId,
            categoryId,
            description,
            imageUrl,
            hasVariants: false,
            minStock: toNullableNumber(minStock),
            maxStock: toNullableNumber(maxStock),
            reorderPoint: toNullableNumber(reorderPoint),
            reorderQuantity: toNullableNumber(reorderQuantity),
            defaultWarehouseId: normalizeId(defaultWarehouseId),
          },
        });

        const productWithRelations = await prisma.product.findUnique({
          where: { id: createdProduct.id },
          include: productInclude,
        });

        // Audit log
        await auditCreate(
          "Product",
          productWithRelations,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        res.status(201).json(buildProductResponse(productWithRelations));
      } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ error: "Failed to create product" });
      }
      break;

    case "GET":
      try {
        // Check permission
        const canRead = await hasPermission(userId, "products", "read");
        if (!canRead) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You don't have permission to view products",
          });
        }

        const { id } = req.query;

        if (id && typeof id === "string") {
          const product = await prisma.product.findUnique({
            where: { id },
            include: productInclude,
          });

          if (!product) {
            return res.status(404).json({ error: "Product not found" });
          }

          return res.status(200).json(buildProductResponse(product));
        }

        const products = await prisma.product.findMany({
          include: productInclude,
        });

        res.status(200).json(products.map(buildProductResponse));
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
      }
      break;

    case "PUT":
      try {
        // Check permission
        const canUpdate = await hasPermission(userId, "products", "update");
        if (!canUpdate) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You don't have permission to update products",
          });
        }

        const {
          id,
          name,
          sku,
          status,
          categoryId,
          description,
          imageUrl,
          minStock,
          maxStock,
          reorderPoint,
          reorderQuantity,
          defaultWarehouseId,
        } = req.body;

        // Get old product state
        const oldProduct = await prisma.product.findUnique({
          where: { id },
          include: productInclude,
        });

        // Update product metadata only - price/quantity come from variants/transactions
        await prisma.product.update({
          where: { id },
          data: {
            name,
            sku,
            status,
            categoryId,
            description,
            imageUrl,
            minStock: toNullableNumber(minStock),
            maxStock: toNullableNumber(maxStock),
            reorderPoint: toNullableNumber(reorderPoint),
            reorderQuantity: toNullableNumber(reorderQuantity),
            defaultWarehouseId: normalizeId(defaultWarehouseId),
          },
        });

        const productWithRelations = await prisma.product.findUnique({
          where: { id },
          include: productInclude,
        });

        // Audit log the update
        await auditUpdate(
          "Product",
          id,
          name,
          oldProduct,
          productWithRelations,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        res.status(200).json(buildProductResponse(productWithRelations));
      } catch (error) {
        console.error("Error updating product:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "UPDATE",
            entityType: "Product",
            entityId: req.body.id,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to update product",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to update product" });
      }
      break;

    case "DELETE":
      try {
        // Check permission
        const canDelete = await hasPermission(userId, "products", "delete");
        if (!canDelete) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You don't have permission to delete products",
          });
        }

        const { id } = req.body;

        // Get product before deletion
        const product = await prisma.product.findUnique({
          where: { id },
          include: productInclude,
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        await prisma.product.delete({
          where: { id },
        });

        // Audit log the deletion
        await auditDelete(
          "Product",
          product,
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
          },
          req
        );

        res.status(204).end();
      } catch (error) {
        console.error("Error deleting product:", error);
        
        await createAuditLog(
          {
            userId: session.id,
            userName: session.name,
            userEmail: session.email,
            action: "DELETE",
            entityType: "Product",
            entityId: req.body.id,
            status: "error",
            errorMessage: error instanceof Error ? error.message : "Failed to delete product",
          },
          req
        );
        
        res.status(500).json({ error: "Failed to delete product" });
      }
      break;

    default:
      res.setHeader("Allow", ["POST", "GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
