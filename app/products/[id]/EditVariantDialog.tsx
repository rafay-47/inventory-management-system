"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/ImageUpload";
import { ProductVariant } from "@/app/types";
import { Save } from "lucide-react";

interface EditVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: ProductVariant;
  onSave: (variantData: any) => void;
}

export default function EditVariantDialog({
  open,
  onOpenChange,
  variant,
  onSave,
}: EditVariantDialogProps) {
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
    imageUrl: "",
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
        imageUrl: variant.imageUrl || "",
        barcode: variant.barcode || "",
        reorderPoint: variant.reorderPoint?.toString() || "",
        isActive: variant.isActive,
      });
    }
  }, [variant]);

  const handleSave = () => {
    onSave({
      id: variant.id,
      ...formData,
      price: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null,
      costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
      reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Variant</DialogTitle>
          <DialogDescription>
            Update variant details for {variant?.name}. Stock is managed via Purchase Orders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Variant Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Large Red"
              />
            </div>
            <div className="space-y-2">
              <Label>
                SKU <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                placeholder="e.g., PROD-L-RED"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Selling Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: e.target.value })
                }
                placeholder="Updated from purchase orders"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                value={formData.reorderPoint}
                onChange={(e) =>
                  setFormData({ ...formData, reorderPoint: e.target.value })
                }
                placeholder="Low stock alert threshold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Size</Label>
              <Input
                value={formData.size}
                onChange={(e) =>
                  setFormData({ ...formData, size: e.target.value })
                }
                placeholder="e.g., Large, XL"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                placeholder="e.g., Red, #FF0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input
                value={formData.barcode}
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                placeholder="e.g., 123456789012"
              />
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Input
                value={formData.material}
                onChange={(e) =>
                  setFormData({ ...formData, material: e.target.value })
                }
                placeholder="e.g., Cotton, Polyester"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weight</Label>
              <Input
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
                placeholder="e.g., 500g, 1.2kg"
              />
            </div>
            <div className="space-y-2">
              <Label>Dimensions</Label>
              <Input
                value={formData.dimensions}
                onChange={(e) =>
                  setFormData({ ...formData, dimensions: e.target.value })
                }
                placeholder="e.g., 10x20x30cm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Variant Image</Label>
            <ImageUpload
              currentImageUrl={formData.imageUrl}
              onImageUploaded={(url) =>
                setFormData({ ...formData, imageUrl: url })
              }
              onImageRemoved={() =>
                setFormData({ ...formData, imageUrl: "" })
              }
              entityType="variant"
              entityId={variant?.id}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active variant (available for sale)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
