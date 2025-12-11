/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProductStore } from "@/app/useProductStore";
import { useToast } from "@/hooks/use-toast";
import ProductName from "./_components/ProductName";
import SKU from "./_components/SKU";
import { Product } from "@/app/types";

const optionalInventoryNumber = z
  .number({ invalid_type_error: "Value must be a number" })
  .int("Value must be a whole number")
  .nonnegative("Value cannot be negative")
  .optional();

const ProductSchema = z.object({
  productName: z
    .string()
    .min(1, "Product Name is required")
    .max(100, "Product Name must be 100 characters or less"),
  sku: z
    .string()
    .min(1, "SKU is required")
    .regex(/^[a-zA-Z0-9-_]+$/, "SKU must be alphanumeric"),
  description: z.string().optional(),
  minStock: optionalInventoryNumber,
  maxStock: optionalInventoryNumber,
  reorderPoint: optionalInventoryNumber,
  reorderQuantity: optionalInventoryNumber,
});

interface ProductFormData {
  productName: string;
  sku: string;
  description?: string;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
}

interface AddProductDialogProps {
  allProducts: Product[];
  userId: string;
}

export default function AddProductDialog({
  allProducts,
  userId,
}: AddProductDialogProps) {
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      productName: "",
      sku: "",
      description: "",
      minStock: undefined,
      maxStock: undefined,
      reorderPoint: undefined,
      reorderQuantity: undefined,
    },
  });

  const { reset } = methods;

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Button loading state
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);

  const {
    isLoading,
    setOpenProductDialog,
    openProductDialog,
    setSelectedProduct,
    selectedProduct,
    addProduct,
    updateProduct,
    loadProducts,
    categories,
    warehouses,
    loadWarehouses,
  } = useProductStore();
  const { toast } = useToast();

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    if (selectedProduct) {
      reset({
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        description: selectedProduct.description ?? "",
        minStock: selectedProduct.minStock ?? undefined,
        maxStock: selectedProduct.maxStock ?? undefined,
        reorderPoint: selectedProduct.reorderPoint ?? undefined,
        reorderQuantity: selectedProduct.reorderQuantity ?? undefined,
      });
      setSelectedCategory(selectedProduct.categoryId || "");
      setSelectedWarehouse(selectedProduct.defaultWarehouseId || "");
    } else {
      // Reset form to default values for adding a new product
      reset({
        productName: "",
        sku: "",
        description: "",
        minStock: undefined,
        maxStock: undefined,
        reorderPoint: undefined,
        reorderQuantity: undefined,
      });
      setSelectedCategory("");
      setSelectedWarehouse("");
    }
  }, [selectedProduct, openProductDialog, reset]);

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true); // Start loading
    // New products start with "Stock Out" status until inventory is received
    const status: Product["status"] = selectedProduct
      ? selectedProduct.status // Keep existing status on update
      : "Stock Out";

    try {
      if (!selectedProduct) {
        const newProduct: Product = {
          id: Date.now().toString(),
          name: data.productName,
          price: 0, // Price comes from variants/purchase orders
          quantity: 0, // Quantity comes from purchase orders
          sku: data.sku,
          status,
          categoryId: selectedCategory,
          createdAt: new Date(),
          userId: userId,
          description: data.description ?? undefined,
          minStock: data.minStock ?? undefined,
          maxStock: data.maxStock ?? undefined,
          reorderPoint: data.reorderPoint ?? undefined,
          reorderQuantity: data.reorderQuantity ?? undefined,
          defaultWarehouseId: selectedWarehouse || undefined,
        };

        const result = await addProduct(newProduct);

        if (result.success) {
          toast({
            title: "Product Created Successfully!",
            description: `"${data.productName}" has been added to your inventory.`,
          });
          dialogCloseRef.current?.click();
          loadProducts();
          setOpenProductDialog(false);
        } else {
          toast({
            title: "Creation Failed",
            description: "Failed to create the product. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        const productToUpdate: Product = {
          id: selectedProduct.id,
          createdAt: new Date(selectedProduct.createdAt), // Convert string to Date
          name: data.productName,
          price: selectedProduct.price, // Keep existing price (from variants)
          quantity: selectedProduct.quantity, // Keep existing quantity (from stock)
          sku: data.sku,
          status,
          categoryId: selectedCategory,
          userId: selectedProduct.userId,
          description: data.description ?? undefined,
          minStock: data.minStock ?? undefined,
          maxStock: data.maxStock ?? undefined,
          reorderPoint: data.reorderPoint ?? undefined,
          reorderQuantity: data.reorderQuantity ?? undefined,
          defaultWarehouseId: selectedWarehouse || undefined,
        };

        const result = await updateProduct(productToUpdate);
        if (result.success) {
          toast({
            title: "Product Updated Successfully!",
            description: `"${data.productName}" has been updated in your inventory.`,
          });
          loadProducts();
          setOpenProductDialog(false);
        } else {
          toast({
            title: "Update Failed",
            description: "Failed to update the product. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); // Stop loading
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // When opening the dialog for adding a new product, clear any selected product
      setSelectedProduct(null);
    } else {
      // When closing the dialog, also clear the selected product to ensure clean state
      setSelectedProduct(null);
    }
    setOpenProductDialog(open);
  };

  return (
    <Dialog open={openProductDialog} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-10 font-semibold">+Add Product</Button>
      </DialogTrigger>
      <DialogContent
        className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle className="text-[22px]">
            {selectedProduct ? "Update Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription id="dialog-description">
          Enter the details of the product below. Stock quantity and pricing
          will be managed through purchase orders and variants.
        </DialogDescription>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ProductName />
              <SKU allProducts={allProducts} />
              <div className="sm:col-span-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <textarea
                  id="description"
                  placeholder="Product description (optional)"
                  className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...methods.register("description")}
                />
              </div>
              <div>
                <Label htmlFor="minStock" className="text-sm font-medium">
                  Minimum Stock
                </Label>
                <Input
                  id="minStock"
                  type="number"
                  placeholder="e.g. 10"
                  className="mt-1 h-11"
                  {...methods.register("minStock", {
                    setValueAs: (value) =>
                      value === "" || value === null
                        ? undefined
                        : Number(value),
                  })}
                />
              </div>
              <div>
                <Label htmlFor="maxStock" className="text-sm font-medium">
                  Maximum Stock
                </Label>
                <Input
                  id="maxStock"
                  type="number"
                  placeholder="e.g. 100"
                  className="mt-1 h-11"
                  {...methods.register("maxStock", {
                    setValueAs: (value) =>
                      value === "" || value === null
                        ? undefined
                        : Number(value),
                  })}
                />
              </div>
              <div>
                <Label htmlFor="reorderPoint" className="text-sm font-medium">
                  Reorder Point
                </Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  placeholder="Alert when quantity falls below"
                  className="mt-1 h-11"
                  {...methods.register("reorderPoint", {
                    setValueAs: (value) =>
                      value === "" || value === null
                        ? undefined
                        : Number(value),
                  })}
                />
              </div>
              <div>
                <Label
                  htmlFor="reorderQuantity"
                  className="text-sm font-medium"
                >
                  Reorder Quantity
                </Label>
                <Input
                  id="reorderQuantity"
                  type="number"
                  placeholder="e.g. 50"
                  className="mt-1 h-11"
                  {...methods.register("reorderQuantity", {
                    setValueAs: (value) =>
                      value === "" || value === null
                        ? undefined
                        : Number(value),
                  })}
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="mt-1 h-11 block w-full rounded-md border-gray-300 shadow-md focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="warehouse"
                  className="block text-sm font-medium"
                >
                  Default Warehouse
                </label>
                <select
                  id="warehouse"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="mt-1 h-11 block w-full rounded-md border-gray-300 shadow-md focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">No Default Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                {warehouses.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a warehouse first to track stock by location.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-9 mb-4 flex flex-col sm:flex-row items-center gap-4">
              <DialogClose asChild>
                <Button
                  ref={dialogCloseRef}
                  variant="secondary"
                  className="h-11 w-full sm:w-auto px-11"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="h-11 w-full sm:w-auto px-11"
                isLoading={isSubmitting} // Button loading effect
              >
                {isSubmitting
                  ? "Loading..."
                  : selectedProduct
                  ? "Update Product"
                  : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
