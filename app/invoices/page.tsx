"use client";

import { useCallback, useEffect, useState } from "react";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import { useAuth } from "@/app/authContext";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Eye, Download, Plus, AlertCircle, Printer } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";
import Loading from "@/components/Loading";

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  orderId: string | null;
  status: string | null;
  issuedAt: string | null;
  dueDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  notes: string | null;
  order?: {
    orderNumber: string | null;
    customer?: {
      name: string;
      email: string | null;
      company: string | null;
    };
    orderItems?: Array<{
      product?: {
        name: string;
        sku: string;
      };
      quantity: number;
      unitPrice: number;
      subtotal: number | null;
    }>;
  };
}

interface Order {
  id: string;
  orderNumber: string | null;
  customerName: string;
  totalAmount: number;
  saleDate: string | null;
}

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "$0.00";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
};

const getStatusColor = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "paid":
      return "default";
    case "issued":
      return "secondary";
    case "overdue":
      return "destructive";
    case "cancelled":
      return "outline";
    default:
      return "secondary";
  }
};

export default function InvoicesPage() {
  const { isLoggedIn, isAdmin } = useAuth();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [createForm, setCreateForm] = useState({
    orderId: "",
    dueDate: "",
    notes: "",
  });

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/invoices");
      setInvoices(response.data);
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadOrders = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/sales");
      setOrders(response.data);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadInvoices();
      loadOrders();
    }
  }, [isLoggedIn, loadInvoices, loadOrders]);

  const handleCreateInvoice = async () => {
    if (!createForm.orderId) {
      toast({
        title: "Error",
        description: "Please select an order",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      await axiosInstance.post("/invoices", {
        orderId: createForm.orderId,
        dueDate: createForm.dueDate || undefined,
        notes: createForm.notes || undefined,
      });

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });

      setShowCreateDialog(false);
      setCreateForm({ orderId: "", dueDate: "", notes: "" });
      loadInvoices();
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/preview`, "_blank");
  };

  const handlePrintInvoice = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/preview`, "_blank");
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/preview`, "_blank");
  };

  // Filter out orders that already have invoices
  const ordersWithoutInvoices = orders.filter(
    (order) => !invoices.some((invoice) => invoice.orderId === order.id)
  );

  if (!isLoggedIn) {
    return <Loading />;
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">
              Generate and manage invoices for your sales orders
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Select an order to generate an invoice
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {ordersWithoutInvoices.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      All orders have invoices. Create a new sale first.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Order</Label>
                      <Select
                        value={createForm.orderId}
                        onValueChange={(value) =>
                          setCreateForm({ ...createForm, orderId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an order" />
                        </SelectTrigger>
                        <SelectContent>
                          {ordersWithoutInvoices.map((order) => (
                            <SelectItem key={order.id} value={order.id}>
                              {order.orderNumber} - {order.customerName} (
                              {formatCurrency(order.totalAmount)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={createForm.dueDate}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, dueDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={createForm.notes}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, notes: e.target.value })
                        }
                        placeholder="Add payment terms, special instructions..."
                      />
                    </div>
                  </>
                )}
              </div>
              {ordersWithoutInvoices.length > 0 && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={creating}>
                    {creating ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No invoices yet. Create your first invoice from a sales order.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin() && <TableHead className="text-right">Amount</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber || "—"}
                      </TableCell>
                      <TableCell>{invoice.order?.orderNumber || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {invoice.order?.customer?.name || "—"}
                          </div>
                          {invoice.order?.customer?.email && (
                            <div className="text-xs text-muted-foreground">
                              {invoice.order.customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(invoice.status)}>
                          {invoice.status || "issued"}
                        </Badge>
                      </TableCell>
                      {isAdmin() && (
                        <TableCell className="text-right">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice.id)}
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintInvoice(invoice.id)}
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice.id)}
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
