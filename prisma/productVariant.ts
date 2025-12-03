import { prisma } from "./client";

export async function getProductVariantById(id: string) {
  return await prisma.productVariant.findUnique({
    where: { id },
  });
}

export async function getProductVariantsBySku(sku: string) {
  return await prisma.productVariant.findUnique({
    where: { sku },
  });
}

export async function getProductVariantsByProductId(productId: string) {
  return await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProductVariant(data: {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  material?: string;
  weight?: string;
  dimensions?: string;
  attributes?: any;
  isActive?: boolean;
}) {
  return await prisma.productVariant.create({
    data,
  });
}

export async function updateProductVariant(
  id: string,
  data: {
    name?: string;
    sku?: string;
    price?: number;
    quantity?: number;
    size?: string;
    color?: string;
    material?: string;
    weight?: string;
    dimensions?: string;
    attributes?: any;
    isActive?: boolean;
  }
) {
  return await prisma.productVariant.update({
    where: { id },
    data,
  });
}

export async function deleteProductVariant(id: string) {
  return await prisma.productVariant.delete({
    where: { id },
  });
}

export async function countProductVariants(productId: string) {
  return await prisma.productVariant.count({
    where: { productId },
  });
}
