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
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

interface SalesTransactionRecord {
  id: string;
  orderNumber: string | null;
  customerName: string;
  customerEmail: string;
  productId: string | null;
  productName: string;
  saleDate: string | null;
  channel: string;
  quantity: number;
  totalAmount: number;
  notes?: string;
}

interface SalesFormState {
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  customerPhone: string;
  productId: string;
  productVariantId: string;
  saleDate: string;
  channel: string;
  quantity: string;
  totalAmount: string;
  notes: string;
}

const salesChannels = ["Online", "Retail", "Wholesale", "Marketplace"];

const createDefaultSalesForm = (): SalesFormState => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    customerName: "",
    customerEmail: "",
    customerCompany: "",
    customerPhone: "",
    productId: "",
    productVariantId: "",
    saleDate: today,
    channel: "Online",
    quantity: "1",
    totalAmount: "",
    notes: "",
  };
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export default function SalesPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const { allProducts, loadProducts } = useProductStore();
  const { toast } = useToast();

  const [salesForm, setSalesForm] = useState<SalesFormState>(
    createDefaultSalesForm()
  );
  const [salesTransactions, setSalesTransactions] = useState<
    SalesTransactionRecord[]
  >([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [savingSale, setSavingSale] = useState(false);

  const fetchSalesTransactions = useCallback(async () => {
    setSalesLoading(true);
    try {
      const response = await axiosInstance.get("/sales");
      setSalesTransactions(response.data ?? []);
    } catch (error) {
      console.error("Error loading sales transactions", error);
      toast({
        title: "Unable to load sales transactions",
        variant: "destructive",
      });
    } finally {
      setSalesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadProducts();
    fetchSalesTransactions();
  }, [isLoggedIn, loadProducts, fetchSalesTransactions]);

  const salesSummary = useMemo(() => {
    const totalRevenue = salesTransactions.reduce(
      (sum, sale) => sum + (sale.totalAmount || 0),
      0
    );
    const totalUnits = salesTransactions.reduce(
      (sum, sale) => sum + (sale.quantity || 0),
      0
    );
    const uniqueCustomers = new Set(
      salesTransactions.map((sale) => sale.customerEmail || sale.customerName)
    ).size;
    return { totalRevenue, totalUnits, uniqueCustomers };
  }, [salesTransactions]);

  if (!isLoggedIn) {
    return <Loading />;
  }

  const handleAddSalesTransaction = async () => {
    // Auto-calculate total amount for non-admin users
    let finalTotalAmount = salesForm.totalAmount;
    if (!isAdmin()) {
      const selectedProduct = allProducts.find(
        (product) => product.id === salesForm.productId
      );
      if (selectedProduct) {
        const quantity = parseFloat(salesForm.quantity) || 1;
        const price = selectedProduct.price || 0;
        finalTotalAmount = (quantity * price).toString();
      }
    }

    if (
      !salesForm.customerName ||
      !salesForm.productId ||
      (!isAdmin() && !finalTotalAmount) ||
      (isAdmin() && !salesForm.totalAmount)
    ) {
      toast({
        title: "Missing information",
        description: "Customer and product are required.",
        variant: "destructive",
      });
      return;
    }

    setSavingSale(true);
    try {
      const response = await axiosInstance.post("/sales", {
        customerName: salesForm.customerName,
        customerEmail: salesForm.customerEmail,
        customerCompany: salesForm.customerCompany,
        customerPhone: salesForm.customerPhone,
        productId: salesForm.productId,
        productVariantId: salesForm.productVariantId || null,
        productName:
          allProducts.find((product) => product.id === salesForm.productId)
            ?.name || "",
        saleDate: salesForm.saleDate,
        channel: salesForm.channel,
        quantity: salesForm.quantity,
        totalAmount: finalTotalAmount,
        notes: salesForm.notes,
      });

      setSalesTransactions((prev) => [response.data, ...prev]);
      setSalesForm(createDefaultSalesForm());
      
      // Refresh products to update stock levels
      loadProducts();
      
      toast({
        title: "Sale recorded",
        description: `${response.data.productName} sold to ${response.data.customerName}. Stock updated.`,
        action: response.data.id ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerateInvoice(response.data.id)}
          >
            <FileText className="w-4 h-4 mr-1" />
            Create Invoice
          </Button>
        ) : undefined,
      });
    } catch (error: any) {
      toast({
        title: "Unable to record sale",
        description: error.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingSale(false);
    }
  };

  const handleGenerateInvoice = async (orderId: string) => {
    try {
      await axiosInstance.post("/invoices", { orderId });
      toast({
        title: "Invoice created",
        description: "Invoice has been generated successfully",
      });
      router.push("/invoices");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Sales</h1>
          <p className="text-muted-foreground">
            Record and track sales transactions with your customers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {salesLoading ? (
            <>
              {isAdmin() && <Skeleton className="h-32" />}
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              {isAdmin() && (
                <Card>
                  <CardHeader>
                    <CardTitle>Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-3xl font-semibold">
                      {formatCurrency(salesSummary.totalRevenue)}
                    </p>
                    <p className="text-sm text-muted-foreground">All sales transactions</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Units Sold</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-semibold">{salesSummary.totalUnits}</p>
                  <p className="text-sm text-muted-foreground">Total quantity sold</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Unique Customers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-semibold">{salesSummary.uniqueCustomers}</p>
                  <p className="text-sm text-muted-foreground">Customer count</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Record Sales Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={salesForm.customerName}
                  onChange={(e) =>
                    setSalesForm({ ...salesForm, customerName: e.target.value })
                  }
                  placeholder="Jane Cooper"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={salesForm.customerEmail}
                  onChange={(e) =>
                    setSalesForm({ ...salesForm, customerEmail: e.target.value })
                  }
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Company</Label>
                <Input
                  value={salesForm.customerCompany}
                  onChange={(e) =>
                    setSalesForm({ ...salesForm, customerCompany: e.target.value })
                  }
                  placeholder="Acme Inc."
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  value={salesForm.customerPhone}
                  onChange={(e) =>
                    setSalesForm({ ...salesForm, customerPhone: e.target.value })
                  }
                  placeholder="+1 555 0123"
                />
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={salesForm.productId}
                  onValueChange={(val) =>
                    setSalesForm({ ...salesForm, productId: val, productVariantId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProducts.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No products available. Add products first.
                      </div>
                    )}
                    {allProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.quantity} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {salesForm.productId && (() => {
                const selectedProduct = allProducts.find(p => p.id === salesForm.productId);
                const variants = selectedProduct?.variants?.filter(v => v.isActive) || [];
                if (variants.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <Label>Variant</Label>
                    <Select
                      value={salesForm.productVariantId}
                      onValueChange={(val) =>
                        setSalesForm({ ...salesForm, productVariantId: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select variant (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name} - {variant.quantity} in stock @ ${variant.price.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}
              <div className="space-y-2">
                <Label>Sale Date</Label>
                <Input
                  type="date"
                  value={salesForm.saleDate}
                  onChange={(e) =>
                    setSalesForm({ ...salesForm, saleDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sales Channel</Label>
                <Select
                  value={salesForm.channel}
                  onValueChange={(val) =>
                    setSalesForm({ ...salesForm, channel: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {salesChannels.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={salesForm.quantity}
                  onChange={(e) =>
                    setSalesForm({ ...salesForm, quantity: e.target.value })
                  }
                  placeholder="1"
                />
              </div>
              {isAdmin() && (
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salesForm.totalAmount}
                    onChange={(e) =>
                      setSalesForm({ ...salesForm, totalAmount: e.target.value })
                    }
                    placeholder="149.99"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={salesForm.notes}
                  onChange={(e) =>
                    setSalesForm({ ...salesForm, notes: e.target.value })
                  }
                  placeholder="Capture delivery instructions or payment references"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAddSalesTransaction}
                disabled={savingSale}
              >
                {savingSale ? "Saving..." : "Save Sales Transaction"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recorded Sales Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : salesTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sales recorded yet. Use the form to add transactions as they occur.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Date</TableHead>
                      {isAdmin() && <TableHead className="text-right">Total</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesTransactions.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="font-medium">{sale.customerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {sale.customerEmail || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sale.productName}
                          <div className="text-xs">Qty: {sale.quantity}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.channel}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(sale.saleDate)}</TableCell>
                        {isAdmin() && (
                          <TableCell className="text-right">
                            {formatCurrency(sale.totalAmount || 0)}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateInvoice(sale.id)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
