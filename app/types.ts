//import { ReactNode } from "react";

// Define the Product interface
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  status?: string;
  createdAt: Date;
  userId: string;
  categoryId: string;
  category?: string;
  supplier?: string;
  hasVariants?: boolean;
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
  defaultWarehouseId?: string | null;
  defaultWarehouseName?: string | null;
  minStock?: number | null;
  maxStock?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
}

// Define the ProductVariant interface
export interface ProductVariant {
  id: string;
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
  attributes?: Record<string, any>;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  barcode?: string | null;
  costPrice?: number | null;
  minStock?: number | null;
  maxStock?: number | null;
  reorderPoint?: number | null;
  expiryDate?: Date | null;
}

// Define the Supplier interface
export interface Supplier {
  id: string;
  name: string;
  userId: string;
}

// Define the Category interface
export interface Category {
  id: string;
  name: string;
  userId: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  userId: string;
}

