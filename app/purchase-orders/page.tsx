"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import { useProductStore } from "@/app/useProductStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/authContext";
import Loading from "@/components/Loading";
import { Skeleton } from "@/components/ui/skeleton";
import axiosInstance from "@/utils/axiosInstance";
import { Check, Plus, Trash2 } from "lucide-react";
import AddSupplierDialog from "@/app/AppTable/ProductDialog/AddSupplierDialog";

interface PurchaseOrderItem {
  id?: string;
  productId: string | null;
  productName?: string;
  productVariantId: string | null;
  variantName?: string | null;
  orderedQuantity: number;
  receivedQuantity?: number;
  costPerUnit: number;
  lineTotal: number;
}

interface PurchaseOrderRecord {
  id: string;
  poNumber: string | null;
  supplierId: string;
  supplierName: string;
  orderedAt: string | null;
  expectedAt: string | null;
  status: string;
  totalCost: number;
  notes?: string;
  items: PurchaseOrderItem[];
}

interface PurchaseFormState {
  orderNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  status: string;
  notes: string;
}

interface LineItemFormState {
  productId: string;
  productVariantId: string;
  orderedQuantity: string;
  costPerUnit: string;
}

const purchaseStatuses = ["Draft", "Submitted", "Received", "Closed"];

const createDefaultPurchaseForm = (): PurchaseFormState => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    orderNumber: "",
    supplierId: "",
    orderDate: today,
    expectedDate: today,
    status: "Draft",
    notes: "",
  };
};

const createDefaultLineItem = (): LineItemFormState => ({
  productId: "",
  productVariantId: "",
  orderedQuantity: "1",
  costPerUnit: "",
});

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export default function PurchaseOrdersPage() {
  const { isLoggedIn } = useAuth();
  const { suppliers, loadSuppliers, allProducts, loadProducts } =
    useProductStore();
  const { toast } = useToast();

  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(
    createDefaultPurchaseForm()
  );
  const [lineItems, setLineItems] = useState<LineItemFormState[]>([
    createDefaultLineItem(),
  ]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>(
    []
  );
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Get variants for a selected product
  const getProductVariants = useCallback(
    (productId: string) => {
      const product = allProducts.find((p) => p.id === productId);
      return product?.variants ?? [];
    },
    [allProducts]
  );

  const fetchPurchaseOrders = useCallback(async () => {
    setPurchaseLoading(true);
    try {
      const response = await axiosInstance.get("/purchase-orders");
      setPurchaseOrders(response.data ?? []);
    } catch (error) {
      console.error("Error loading purchase orders", error);
      toast({
        title: "Unable to load purchase orders",
        variant: "destructive",
      });
    } finally {
      setPurchaseLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadSuppliers();
    loadProducts();
    fetchPurchaseOrders();
  }, [isLoggedIn, loadSuppliers, loadProducts, fetchPurchaseOrders]);

  const purchaseSummary = useMemo(() => {
    const totalSpend = purchaseOrders.reduce(
      (sum, order) => sum + (order.totalCost || 0),
      0
    );
    const pending = purchaseOrders.filter(
      (order) => order.status !== "Closed"
    ).length;
    return { totalSpend, pending };
  }, [purchaseOrders]);

  const calculatedTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const qty = Number(item.orderedQuantity) || 0;
      const cost = Number(item.costPerUnit) || 0;
      return sum + qty * cost;
    }, 0);
  }, [lineItems]);

  if (!isLoggedIn) {
    return <Loading />;
  }

  const handleAddLineItem = () => {
    setLineItems([...lineItems, createDefaultLineItem()]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemFormState,
    value: string
  ) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    // Reset variant when product changes
    if (field === "productId") {
      updated[index].productVariantId = "";
    }
    setLineItems(updated);
  };

  const handleAddPurchaseOrder = async () => {
    if (!purchaseForm.orderNumber || !purchaseForm.supplierId) {
      toast({
        title: "Missing information",
        description: "Order number and supplier are required.",
        variant: "destructive",
      });
      return;
    }

    // Validate line items have at least a product
    const validItems = lineItems.filter((item) => item.productId);
    if (validItems.length === 0) {
      toast({
        title: "Missing items",
        description: "Add at least one product to the purchase order.",
        variant: "destructive",
      });
      return;
    }

    setSavingPurchase(true);
    try {
      const response = await axiosInstance.post("/purchase-orders", {
        orderNumber: purchaseForm.orderNumber,
        supplierId: purchaseForm.supplierId,
        orderDate: purchaseForm.orderDate,
        expectedDate: purchaseForm.expectedDate,
        status: purchaseForm.status,
        notes: purchaseForm.notes,
        items: validItems.map((item) => ({
          productId: item.productId,
          productVariantId: item.productVariantId || null,
          orderedQuantity: item.orderedQuantity,
          costPerUnit: item.costPerUnit,
        })),
      });

      setPurchaseOrders((prev) => [response.data, ...prev]);
      setPurchaseForm(createDefaultPurchaseForm());
      setLineItems([createDefaultLineItem()]);
      toast({
        title: "Purchase order saved",
        description: `PO ${response.data.poNumber} recorded successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Unable to save purchase order",
        description: error.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPurchase(false);
    }
  };

  const handleReceiveOrder = async (orderId: string, poNumber: string | null) => {
    setReceivingOrderId(orderId);
    try {
      const response = await axiosInstance.post(`/purchase-orders/${orderId}/receive`);
      
      // Update the order in state
      setPurchaseOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: "Received" }
            : order
        )
      );
      
      // Reload products to get updated stock levels
      loadProducts();
      
      toast({
        title: "Purchase Order Received",
        description: `${poNumber || "Order"} has been received. Stock levels updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Unable to receive order",
        description: error.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReceivingOrderId(null);
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Create and manage purchase orders with your suppliers. Receiving an
            order will update your inventory stock levels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purchaseLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Pending Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-semibold">{purchaseSummary.pending}</p>
                  <p className="text-sm text-muted-foreground">Awaiting completion</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Spend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-semibold">
                    {formatCurrency(purchaseSummary.totalSpend)}
                  </p>
                  <p className="text-sm text-muted-foreground">All purchase orders</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Purchase Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Number</Label>
                  <Input
                    value={purchaseForm.orderNumber}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        orderNumber: e.target.value,
                      })
                    }
                    placeholder="PO-001"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Supplier</Label>
                    <AddSupplierDialog />
                  </div>
                  <Select
                    value={purchaseForm.supplierId}
                    onValueChange={(val) =>
                      setPurchaseForm({ ...purchaseForm, supplierId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Add suppliers to start logging purchase orders.
                        </div>
                      )}
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={purchaseForm.orderDate}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        orderDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery</Label>
                  <Input
                    type="date"
                    value={purchaseForm.expectedDate}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        expectedDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={purchaseForm.status}
                    onValueChange={(val) =>
                      setPurchaseForm({ ...purchaseForm, status: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={purchaseForm.notes}
                  onChange={(e) =>
                    setPurchaseForm({ ...purchaseForm, notes: e.target.value })
                  }
                  placeholder="Include payment terms or shipment details"
                  rows={2}
                />
              </div>

              {/* Line Items Section */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {lineItems.map((item, index) => {
                  const variants = getProductVariants(item.productId);
                  const lineTotal =
                    (Number(item.orderedQuantity) || 0) *
                    (Number(item.costPerUnit) || 0);

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="col-span-12 md:col-span-4 space-y-1">
                        <Label className="text-xs">Product</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(val) =>
                            handleLineItemChange(index, "productId", val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {allProducts.length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No products available.
                              </div>
                            )}
                            {allProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-12 md:col-span-3 space-y-1">
                        <Label className="text-xs">Variant (optional)</Label>
                        <Select
                          value={item.productVariantId}
                          onValueChange={(val) =>
                            handleLineItemChange(index, "productVariantId", val)
                          }
                          disabled={!item.productId || variants.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                variants.length === 0
                                  ? "No variants"
                                  : "Select variant"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {variants.map((variant) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {variant.name} ({variant.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.orderedQuantity}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "orderedQuantity",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="col-span-4 md:col-span-2 space-y-1">
                        <Label className="text-xs">Cost/Unit</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.costPerUnit}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "costPerUnit",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div className="col-span-3 md:col-span-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {formatCurrency(lineTotal)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end pt-2">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                      Order Total:{" "}
                    </span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(calculatedTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleAddPurchaseOrder}
                disabled={savingPurchase}
              >
                {savingPurchase ? "Saving..." : "Save Purchase Order"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recorded Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : purchaseOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No purchase orders recorded yet. Use the form to add your first
                  entry.
                </p>
              ) : (
                <div className="space-y-2">
                  {purchaseOrders.map((order) => {
                    const canReceive =
                      order.status !== "Received" && order.status !== "Closed";
                    const isReceiving = receivingOrderId === order.id;

                    return (
                      <div key={order.id} className="border rounded-lg">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              className="flex-1 text-left hover:bg-muted/50 transition-colors rounded -m-2 p-2"
                              onClick={() => toggleOrderExpand(order.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    {order.poNumber || "—"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {order.supplierName}
                                  </div>
                                </div>
                                <div className="text-right space-y-1">
                                  <Badge
                                    variant={
                                      order.status === "Received"
                                        ? "default"
                                        : order.status === "Closed"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className={
                                      order.status === "Received"
                                        ? "bg-green-600"
                                        : ""
                                    }
                                  >
                                    {order.status}
                                  </Badge>
                                  <div className="text-sm font-medium">
                                    {formatCurrency(order.totalCost || 0)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                Ordered: {formatDate(order.orderedAt)} · Expected:{" "}
                                {formatDate(order.expectedAt)} ·{" "}
                                {order.items?.length || 0} item(s)
                              </div>
                            </button>

                            {canReceive && (
                              <Button
                                size="sm"
                                className="ml-4 bg-green-600 hover:bg-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReceiveOrder(order.id, order.poNumber);
                                }}
                                disabled={isReceiving}
                              >
                                {isReceiving ? (
                                  "Receiving..."
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Receive
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {expandedOrderId === order.id && order.items?.length > 0 && (
                          <div className="border-t px-4 py-3 bg-muted/30">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Variant</TableHead>
                                  <TableHead className="text-right">
                                    Ordered
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Received
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Cost/Unit
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Line Total
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.items.map((item, idx) => (
                                  <TableRow key={item.id || idx}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell>
                                      {item.variantName || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {item.orderedQuantity}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {item.receivedQuantity || 0}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(item.costPerUnit || 0)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(item.lineTotal || 0)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
