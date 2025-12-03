"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProductVariant } from "@/app/types";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { Checkbox } from "@/components/ui/checkbox";

interface AddVariantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onVariantAdded: () => void;
}

export default function AddVariantDialog({
  isOpen,
  onClose,
  productId,
  productName,
  onVariantAdded,
}: AddVariantDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    sellingPrice: "",
    costPrice: "",
    size: "",
    color: "",
    material: "",
    weight: "",
    dimensions: "",
    minStock: "",
    maxStock: "",
    reorderPoint: "",
    isActive: true,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axiosInstance.post("/variants", {
        productId,
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || null,
        price: formData.sellingPrice ? parseFloat(formData.sellingPrice) : 0,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        quantity: 0, // Quantity starts at 0, updated via purchase orders
        size: formData.size || null,
        color: formData.color || null,
        material: formData.material || null,
        weight: formData.weight || null,
        dimensions: formData.dimensions || null,
        minStock: formData.minStock ? parseInt(formData.minStock) : null,
        maxStock: formData.maxStock ? parseInt(formData.maxStock) : null,
        reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : null,
        isActive: formData.isActive,
      });

      toast({
        title: "Variant Added",
        description: `${formData.name} has been added successfully. Add stock via Purchase Orders.`,
      });

      // Reset form
      setFormData({
        name: "",
        sku: "",
        barcode: "",
        sellingPrice: "",
        costPrice: "",
        size: "",
        color: "",
        material: "",
        weight: "",
        dimensions: "",
        minStock: "",
        maxStock: "",
        reorderPoint: "",
        isActive: true,
      });

      onVariantAdded();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add variant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Product Variant</DialogTitle>
          <DialogDescription>
            Add a new variant for <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Variant Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Large Red T-Shirt"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">
                  SKU <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="e.g., TSHIRT-L-RED-001"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  placeholder="e.g., 1234567890123"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Pricing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sellingPrice">Selling Price</Label>
                  <Input
                    id="sellingPrice"
                    name="sellingPrice"
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Price at which you sell this variant
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">Cost Price (Reference)</Label>
                  <Input
                    id="costPrice"
                    name="costPrice"
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Will be updated from purchase orders
                  </p>
                </div>
              </div>
            </div>

            {/* Stock Thresholds */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Stock Alerts</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Stock quantity starts at 0 and is updated when purchase orders are received.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="minStock">Min Stock</Label>
                  <Input
                    id="minStock"
                    name="minStock"
                    type="number"
                    value={formData.minStock}
                    onChange={handleInputChange}
                    placeholder="10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxStock">Max Stock</Label>
                  <Input
                    id="maxStock"
                    name="maxStock"
                    type="number"
                    value={formData.maxStock}
                    onChange={handleInputChange}
                    placeholder="100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    name="reorderPoint"
                    type="number"
                    value={formData.reorderPoint}
                    onChange={handleInputChange}
                    placeholder="20"
                  />
                </div>
              </div>
            </div>

            {/* Variant Attributes */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Variant Attributes</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    placeholder="e.g., Large, XL, 42"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="e.g., Red, Blue, #FF0000"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    name="material"
                    value={formData.material}
                    onChange={handleInputChange}
                    placeholder="e.g., Cotton, Polyester"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    placeholder="e.g., 250g, 1.5kg"
                  />
                </div>

                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    placeholder="e.g., 10x15x20 cm"
                  />
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: !!checked }))
                }
              />
              <Label
                htmlFor="isActive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Active (available for sale)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Variant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
