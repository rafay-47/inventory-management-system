"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ProductVariant } from "@/app/types";
import { useState, useEffect } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { Edit, Plus, Trash2 } from "lucide-react";
import AddVariantDialog from "./AddVariantDialog";
import EditVariantDialog from "./EditVariantDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ViewVariantsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function ViewVariantsDialog({
  isOpen,
  onClose,
  productId,
  productName,
}: ViewVariantsDialogProps) {
  const { toast } = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const fetchVariants = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/variants?productId=${productId}`);
      setVariants(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load variants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVariants();
    }
  }, [isOpen, productId]);

  const handleDelete = async () => {
    if (!selectedVariant) return;

    try {
      await axiosInstance.delete(`/variants?id=${selectedVariant.id}`);
      toast({
        title: "Variant Deleted",
        description: "The variant has been deleted successfully.",
      });
      fetchVariants();
      setShowDeleteDialog(false);
      setSelectedVariant(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete variant",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setShowEditDialog(true);
  };

  const handleDeleteClick = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setShowDeleteDialog(true);
  };

  const getTotalQuantity = () => {
    return variants.reduce((sum, v) => sum + v.quantity, 0);
  };

  const getTotalValue = () => {
    return variants.reduce((sum, v) => sum + v.price * v.quantity, 0);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Variants - {productName}</DialogTitle>
            <DialogDescription>
              Manage variants for this product
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Cards */}
            {variants.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Variants</p>
                  <p className="text-2xl font-bold">{variants.length}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Stock</p>
                  <p className="text-2xl font-bold">{getTotalQuantity()}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Inventory Value</p>
                  <p className="text-2xl font-bold">${getTotalValue().toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Add Variant Button */}
            <div className="flex justify-end">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            </div>

            {/* Variants Table */}
            {isLoading ? (
              <div className="text-center py-8">Loading variants...</div>
            ) : variants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No variants found. Click "Add Variant" to create one.
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.name}</TableCell>
                        <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                        <TableCell>{variant.size || "-"}</TableCell>
                        <TableCell>
                          {variant.color ? (
                            <div className="flex items-center gap-2">
                              {variant.color.startsWith("#") && (
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: variant.color }}
                                />
                              )}
                              <span>{variant.color}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {variant.price > 0 ? `$${variant.price.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {variant.costPrice ? `$${variant.costPrice.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={variant.quantity > 0 ? "default" : "destructive"}>
                            {variant.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant.isActive ? "default" : "secondary"}>
                            {variant.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(variant)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(variant)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Variant Dialog */}
      <AddVariantDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        productId={productId}
        productName={productName}
        onVariantAdded={() => {
          fetchVariants();
        }}
      />

      {/* Edit Variant Dialog */}
      <EditVariantDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedVariant(null);
        }}
        variant={selectedVariant}
        onVariantUpdated={() => {
          fetchVariants();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the variant "{selectedVariant?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedVariant(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
