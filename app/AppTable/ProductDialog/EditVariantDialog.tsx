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
import { useState, useEffect } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { Checkbox } from "@/components/ui/checkbox";

interface EditVariantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant | null;
  onVariantUpdated: () => void;
}

export default function EditVariantDialog({
  isOpen,
  onClose,
  variant,
  onVariantUpdated,
}: EditVariantDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    sellingPrice: "",
    costPrice: "",
    size: "",
    color: "",
    material: "",
    weight: "",
    dimensions: "",
    barcode: "",
    reorderPoint: "",
    isActive: true,
  });

  useEffect(() => {
    if (variant) {
      setFormData({
        name: variant.name,
        sku: variant.sku,
        sellingPrice: variant.price?.toString() || "",
        costPrice: variant.costPrice?.toString() || "",
        size: variant.size || "",
        color: variant.color || "",
        material: variant.material || "",
        weight: variant.weight || "",
        dimensions: variant.dimensions || "",
        barcode: variant.barcode || "",
        reorderPoint: variant.reorderPoint?.toString() || "",
        isActive: variant.isActive,
      });
    }
  }, [variant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant) return;

    setIsLoading(true);

    try {
      await axiosInstance.put("/variants", {
        id: variant.id,
        name: formData.name,
        sku: formData.sku,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        size: formData.size || null,
        color: formData.color || null,
        material: formData.material || null,
        weight: formData.weight || null,
        dimensions: formData.dimensions || null,
        barcode: formData.barcode || null,
        reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : null,
        isActive: formData.isActive,
      });

      toast({
        title: "Variant Updated",
        description: `${formData.name} has been updated successfully.`,
      });

      onVariantUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update variant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!variant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product Variant</DialogTitle>
          <DialogDescription>
            Update the details for this variant. Stock is managed via Purchase Orders.
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
                  placeholder="e.g., 123456789012"
                />
              </div>
            </div>

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
              </div>

              <div className="grid gap-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={handleInputChange}
                  placeholder="Updated from purchase orders"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Current Stock (read-only)</Label>
                <Input
                  type="number"
                  value={variant?.quantity || 0}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Stock is updated via Purchase Orders
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  name="reorderPoint"
                  type="number"
                  value={formData.reorderPoint}
                  onChange={handleInputChange}
                  placeholder="Low stock alert threshold"
                />
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
              {isLoading ? "Updating..." : "Update Variant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
