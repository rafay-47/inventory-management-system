import { ProductVariant } from "@/app/types";

/**
 * Compute aggregated product data from variants
 */
export function computeProductFromVariants(variants: ProductVariant[]) {
  if (!variants || variants.length === 0) {
    return {
      price: 0,
      quantity: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      totalValue: 0,
    };
  }

  const activeVariants = variants.filter((v) => v.isActive);
  const allPrices = activeVariants.map((v) => v.price);
  const totalQuantity = activeVariants.reduce((sum, v) => sum + v.quantity, 0);
  const totalValue = activeVariants.reduce(
    (sum, v) => sum + v.price * v.quantity,
    0
  );

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const avgPrice = totalValue / totalQuantity || 0;

  return {
    price: minPrice, // Display minimum price
    quantity: totalQuantity,
    minPrice,
    maxPrice,
    avgPrice,
    totalValue,
  };
}

/**
 * Format price range for display
 */
export function formatPriceRange(minPrice: number, maxPrice: number): string {
  if (minPrice === maxPrice) {
    return `$${minPrice.toFixed(2)}`;
  }
  return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
}

/**
 * Get product display price
 * - For products with variants: shows price range
 * - For products without variants: shows single price
 */
export function getProductDisplayPrice(
  hasVariants: boolean,
  basePrice: number,
  variants?: ProductVariant[]
): string {
  if (!hasVariants) {
    return `$${basePrice.toFixed(2)}`;
  }

  if (!variants || variants.length === 0) {
    return "$0.00";
  }

  const { minPrice, maxPrice } = computeProductFromVariants(variants);
  return formatPriceRange(minPrice, maxPrice);
}

/**
 * Get product display quantity
 * - For products with variants: sum of all variant quantities
 * - For products without variants: base quantity
 */
export function getProductDisplayQuantity(
  hasVariants: boolean,
  baseQuantity: number,
  variants?: ProductVariant[]
): number {
  if (!hasVariants) {
    return baseQuantity;
  }

  if (!variants || variants.length === 0) {
    return 0;
  }

  const { quantity } = computeProductFromVariants(variants);
  return quantity;
}
