"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "@/utils/axiosInstance";
import {
  Product,
  ProductVariant,
  Category,
  Supplier,
  Warehouse,
} from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import ImageUpload from "@/components/ImageUpload";
import EditVariantDialog from "./EditVariantDialog";
import { ArrowLeft, Edit, Plus, Save, Trash2 } from "lucide-react";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import Image from "next/image";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(
    null
  );
  const [showEditVariantDialog, setShowEditVariantDialog] = useState(false);
  const [variantToEdit, setVariantToEdit] = useState<ProductVariant | null>(null);
  const [showAddVariant, setShowAddVariant] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    status: "Available",
    categoryId: "",
    supplierId: "",
    imageUrl: "",
    defaultWarehouseId: "",
    minStock: "",
    maxStock: "",
    reorderPoint: "",
    reorderQuantity: "",
  });

  const [variantFormData, setVariantFormData] = useState({
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
    minStock: "",
    maxStock: "",
    reorderPoint: "",
    expiryDate: "",
    isActive: true,
  });

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
      fetchCategories();
      fetchSuppliers();
      fetchWarehouses();
    }
  }, [productId]);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/products/${productId}`);
      const currentProduct = response.data;

      if (currentProduct) {
        setProduct(currentProduct);
        setFormData({
          name: currentProduct.name,
          sku: currentProduct.sku,
          description: currentProduct.description || "",
          status: currentProduct.status || "Available",
          categoryId: currentProduct.categoryId,
          supplierId: currentProduct.supplierId,
          imageUrl: currentProduct.imageUrl || "",
          defaultWarehouseId: currentProduct.defaultWarehouseId || "",
          minStock:
            typeof currentProduct.minStock === "number"
              ? currentProduct.minStock.toString()
              : "",
          maxStock:
            typeof currentProduct.maxStock === "number"
              ? currentProduct.maxStock.toString()
              : "",
          reorderPoint:
            typeof currentProduct.reorderPoint === "number"
              ? currentProduct.reorderPoint.toString()
              : "",
          reorderQuantity:
            typeof currentProduct.reorderQuantity === "number"
              ? currentProduct.reorderQuantity.toString()
              : "",
        });
      } else {
        toast({
          title: "Product Not Found",
          description: "The product you're looking for doesn't exist",
          variant: "destructive",
        });
        router.push("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axiosInstance.get("/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await axiosInstance.get("/warehouses");
      setWarehouses(response.data);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      const payload = {
        id: productId,
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        status: formData.status,
        categoryId: formData.categoryId,
        supplierId: formData.supplierId,
        imageUrl: formData.imageUrl,
        defaultWarehouseId: formData.defaultWarehouseId || null,
        minStock: formData.minStock === "" ? null : Number(formData.minStock),
        maxStock: formData.maxStock === "" ? null : Number(formData.maxStock),
        reorderPoint:
          formData.reorderPoint === "" ? null : Number(formData.reorderPoint),
        reorderQuantity:
          formData.reorderQuantity === ""
            ? null
            : Number(formData.reorderQuantity),
      };

      await axiosInstance.put("/products", payload);

      toast({
        title: "Product Updated",
        description: "Product details have been saved successfully",
      });

      setEditMode(false);
      await fetchProductDetails();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.response?.data?.error || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    if (!variantFormData.name || !variantFormData.sku) {
      toast({
        title: "Validation Error",
        description: "Please fill in variant name and SKU",
        variant: "destructive",
      });
      return;
    }

    try {
      await axiosInstance.post("/variants", {
        productId,
        ...variantFormData,
        sellingPrice: variantFormData.sellingPrice ? parseFloat(variantFormData.sellingPrice) : null,
        costPrice: variantFormData.costPrice ? parseFloat(variantFormData.costPrice) : null,
      });

      toast({
        title: "Variant Added",
        description: "New variant has been added successfully",
      });

      // Reset form
      setVariantFormData({
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
        minStock: "",
        maxStock: "",
        reorderPoint: "",
        expiryDate: "",
        isActive: true,
      });
      setShowAddVariant(false);
      await fetchProductDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add variant",
        variant: "destructive",
      });
    }
  };

  const handleUpdateVariant = async (variantData: any) => {
    try {
      await axiosInstance.put("/variants", variantData);

      toast({
        title: "Variant Updated",
        description: "Variant has been updated successfully",
      });

      setShowEditVariantDialog(false);
      setVariantToEdit(null);
      await fetchProductDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update variant",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVariant = async () => {
    if (!variantToDelete) return;

    try {
      await axiosInstance.delete(`/variants?id=${variantToDelete.id}`);

      toast({
        title: "Variant Deleted",
        description: "Variant has been deleted successfully",
      });

      setShowDeleteDialog(false);
      setVariantToDelete(null);
      await fetchProductDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete variant",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading product details...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-muted-foreground">SKU: {product.sku}</p>
            </div>
          </div>
          {!editMode && (
            <Button onClick={() => setEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
          )}
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Product Details</TabsTrigger>
            <TabsTrigger value="variants">
              Variants ({product.variants?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Product Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                  <CardDescription>
                    Basic product details and information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    {editMode ? (
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium">{product.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>SKU</Label>
                    {editMode ? (
                      <Input
                        value={formData.sku}
                        onChange={(e) =>
                          setFormData({ ...formData, sku: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-sm font-medium font-mono">{product.sku}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    {editMode ? (
                      <Textarea
                        value={formData.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm">
                        {product.description || "No description available"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    {editMode ? (
                      <Input
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                      />
                    ) : (
                      <Badge>{product.status}</Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Category</Label>
                    {editMode ? (
                      <select
                        className="w-full p-2 border rounded-md"
                        value={formData.categoryId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setFormData({ ...formData, categoryId: e.target.value })
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium">{product.category}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    {editMode ? (
                      <select
                        className="w-full p-2 border rounded-md"
                        value={formData.supplierId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setFormData({ ...formData, supplierId: e.target.value })
                        }
                      >
                        {suppliers.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium">{product.supplier}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Default Warehouse</Label>
                    {editMode ? (
                      <select
                        className="w-full p-2 border rounded-md"
                        value={formData.defaultWarehouseId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setFormData({
                            ...formData,
                            defaultWarehouseId: e.target.value,
                          })
                        }
                      >
                        <option value="">No Default Warehouse</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium">
                        {product.defaultWarehouseName || "—"}
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Stock</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          value={formData.minStock}
                          onChange={(e) =>
                            setFormData({ ...formData, minStock: e.target.value })
                          }
                          placeholder="e.g. 10"
                        />
                      ) : (
                        <p className="text-sm font-medium">
                          {typeof product.minStock === "number"
                            ? product.minStock
                            : "—"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Maximum Stock</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          value={formData.maxStock}
                          onChange={(e) =>
                            setFormData({ ...formData, maxStock: e.target.value })
                          }
                          placeholder="e.g. 100"
                        />
                      ) : (
                        <p className="text-sm font-medium">
                          {typeof product.maxStock === "number"
                            ? product.maxStock
                            : "—"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Reorder Point</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          value={formData.reorderPoint}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reorderPoint: e.target.value,
                            })
                          }
                          placeholder="Alert below this quantity"
                        />
                      ) : (
                        <p className="text-sm font-medium">
                          {typeof product.reorderPoint === "number"
                            ? product.reorderPoint
                            : "—"}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Reorder Quantity</Label>
                      {editMode ? (
                        <Input
                          type="number"
                          value={formData.reorderQuantity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reorderQuantity: e.target.value,
                            })
                          }
                          placeholder="Suggested purchase quantity"
                        />
                      ) : (
                        <p className="text-sm font-medium">
                          {typeof product.reorderQuantity === "number"
                            ? product.reorderQuantity
                            : "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {editMode && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveProduct} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditMode(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Image */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Image</CardTitle>
                  <CardDescription>
                    Main product image (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    currentImageUrl={formData.imageUrl}
                    onImageUploaded={(url) =>
                      setFormData({ ...formData, imageUrl: url })
                    }
                    onImageRemoved={() =>
                      setFormData({ ...formData, imageUrl: "" })
                    }
                    entityType="product"
                    entityId={productId}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Product Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Summary</CardTitle>
                <CardDescription>
                  Stock levels are updated when purchase orders are received
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Variants</p>
                    <p className="text-2xl font-bold">
                      {product.variants?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Stock</p>
                    <p className="text-2xl font-bold">{product.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="text-2xl font-bold">
                      {product.price > 0 ? `$${product.price.toFixed(2)}` : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Variants</CardTitle>
                    <CardDescription>
                      Manage different variations of this product
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddVariant(!showAddVariant)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Variant Form */}
                {showAddVariant && (
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg">New Variant</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Variant Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={variantFormData.name}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                name: e.target.value,
                              })
                            }
                            placeholder="e.g., Large Red"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            SKU <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={variantFormData.sku}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                sku: e.target.value,
                              })
                            }
                            placeholder="e.g., PROD-L-RED"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Selling Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variantFormData.sellingPrice}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                sellingPrice: e.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cost Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variantFormData.costPrice}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                costPrice: e.target.value,
                              })
                            }
                            placeholder="Will be set from purchase orders"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Size</Label>
                          <Input
                            value={variantFormData.size}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                size: e.target.value,
                              })
                            }
                            placeholder="e.g., Large, XL"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Color</Label>
                          <Input
                            value={variantFormData.color}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                color: e.target.value,
                              })
                            }
                            placeholder="e.g., Red, #FF0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Barcode</Label>
                          <Input
                            value={variantFormData.barcode}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                barcode: e.target.value,
                              })
                            }
                            placeholder="e.g., 123456789012"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reorder Point</Label>
                          <Input
                            type="number"
                            value={variantFormData.reorderPoint}
                            onChange={(e) =>
                              setVariantFormData({
                                ...variantFormData,
                                reorderPoint: e.target.value,
                              })
                            }
                            placeholder="Low stock alert threshold"
                          />
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Stock quantity starts at 0. Use Purchase Orders to add inventory.
                      </p>

                      <div className="space-y-2">
                        <Label>Variant Image</Label>
                        <ImageUpload
                          currentImageUrl={variantFormData.imageUrl}
                          onImageUploaded={(url) =>
                            setVariantFormData({
                              ...variantFormData,
                              imageUrl: url,
                            })
                          }
                          onImageRemoved={() =>
                            setVariantFormData({
                              ...variantFormData,
                              imageUrl: "",
                            })
                          }
                          entityType="variant"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleAddVariant}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Variant
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddVariant(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Variants List */}
                {product.variants && product.variants.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
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
                        {product.variants.map((variant) => (
                          <TableRow key={variant.id}>
                            <TableCell>
                              {variant.imageUrl ? (
                                <div className="relative w-12 h-12 rounded overflow-hidden">
                                  <Image
                                    src={variant.imageUrl}
                                    alt={variant.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                  No img
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {variant.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {variant.sku}
                            </TableCell>
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
                              <Badge
                                variant={
                                  variant.quantity > 0 ? "default" : "destructive"
                                }
                              >
                                {variant.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  variant.isActive ? "default" : "secondary"
                                }
                              >
                                {variant.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setVariantToEdit(variant);
                                    setShowEditVariantDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setVariantToDelete(variant);
                                    setShowDeleteDialog(true);
                                  }}
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
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No variants found. Click "Add Variant" to create one.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the variant "{variantToDelete?.name}
                ". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setVariantToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVariant}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Variant Dialog */}
        {variantToEdit && (
          <EditVariantDialog
            open={showEditVariantDialog}
            onOpenChange={setShowEditVariantDialog}
            variant={variantToEdit}
            onSave={handleUpdateVariant}
          />
        )}
      </div>
    </AuthenticatedLayout>
  );
}
