"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import { useAuth } from "@/app/authContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  Plus,
  Eye,
  Users,
  Activity,
  AlertCircle,
} from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SalesTransaction {
  id: string;
  orderNumber: string | null;
  customerName: string;
  customerEmail: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  saleDate: string | null;
  channel: string;
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category?: {
    name: string;
  };
}

interface DashboardStats {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  totalSales: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  totalOrders: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export default function SalespersonDashboard() {
  const router = useRouter();
  const { isLoggedIn, isSalesperson, user, isLoading } = useAuth();
  const { toast } = useToast();

  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("week");

  // Redirect if not a salesperson
  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading || !isLoggedIn) return;
    if (!isSalesperson()) {
      router.push("/");
      toast({
        title: "Access Denied",
        description: "This dashboard is only available for salespersons.",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, isLoading, isSalesperson, router, toast]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        axiosInstance.get("/sales"),
        axiosInstance.get("/products"),
      ]);
      setSalesTransactions(salesRes.data ?? []);
      // Handle paginated products response
      const productsData = productsRes.data?.products || productsRes.data || [];
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading data", error);
      toast({
        title: "Unable to load data",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading || !isLoggedIn) return;
    if (isSalesperson()) {
      fetchData();
    }
  }, [isLoggedIn, isLoading, isSalesperson, fetchData]);

  // Calculate dashboard statistics
  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const calculateStats = (transactions: SalesTransaction[]) => {
      return transactions.reduce(
        (acc, sale) => {
          const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;
          if (!saleDate) return acc;

          const revenue = sale.totalAmount || 0;
          const units = sale.quantity || 0;

          // Total stats
          acc.totalRevenue += revenue;
          acc.totalOrders += 1;
          acc.totalSales += units;

          // Today stats
          if (saleDate >= today) {
            acc.todayRevenue += revenue;
            acc.todayOrders += 1;
            acc.todaySales += units;
          }

          // Week stats
          if (saleDate >= weekAgo) {
            acc.weekRevenue += revenue;
            acc.weekOrders += 1;
            acc.weekSales += units;
          }

          // Month stats
          if (saleDate >= monthAgo) {
            acc.monthRevenue += revenue;
            acc.monthOrders += 1;
            acc.monthSales += units;
          }

          return acc;
        },
        {
          todaySales: 0,
          weekSales: 0,
          monthSales: 0,
          totalSales: 0,
          todayOrders: 0,
          weekOrders: 0,
          monthOrders: 0,
          totalOrders: 0,
          todayRevenue: 0,
          weekRevenue: 0,
          monthRevenue: 0,
          totalRevenue: 0,
        }
      );
    };

    return calculateStats(salesTransactions);
  }, [salesTransactions]);

  // Get filtered transactions based on time filter
  const filteredTransactions = useMemo(() => {
    if (timeFilter === "all") return salesTransactions;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return salesTransactions.filter((sale) => {
      const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;
      if (!saleDate) return false;

      switch (timeFilter) {
        case "today":
          return saleDate >= today;
        case "week":
          return saleDate >= weekAgo;
        case "month":
          return saleDate >= monthAgo;
        default:
          return true;
      }
    });
  }, [salesTransactions, timeFilter]);

  // Get low stock and out of stock products
  const inventoryAlerts = useMemo(() => {
    const lowStock = products.filter(
      (p) => p.quantity > 0 && p.quantity <= 20
    );
    const outOfStock = products.filter((p) => p.quantity === 0);
    return { lowStock, outOfStock };
  }, [products]);

  // Get best selling products
  const bestSellingProducts = useMemo(() => {
    const productSales = salesTransactions.reduce((acc, sale) => {
      const key = sale.productName;
      if (!acc[key]) {
        acc[key] = { name: key, quantity: 0, revenue: 0 };
      }
      acc[key].quantity += sale.quantity;
      acc[key].revenue += sale.totalAmount;
      return acc;
    }, {} as Record<string, { name: string; quantity: number; revenue: number }>);

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [salesTransactions]);

  // Show loading while checking auth
  if (isLoading) {
    return <Loading />;
  }

  if (!isLoggedIn) {
    return <Loading />;
  }

  if (!isSalesperson()) {
    return null;
  }

  const getCurrentStats = () => {
    switch (timeFilter) {
      case "today":
        return {
          revenue: stats.todayRevenue,
          orders: stats.todayOrders,
          units: stats.todaySales,
        };
      case "week":
        return {
          revenue: stats.weekRevenue,
          orders: stats.weekOrders,
          units: stats.weekSales,
        };
      case "month":
        return {
          revenue: stats.monthRevenue,
          orders: stats.monthOrders,
          units: stats.monthSales,
        };
      case "all":
        return {
          revenue: stats.totalRevenue,
          orders: stats.totalOrders,
          units: stats.totalSales,
        };
      default:
        return {
          revenue: stats.todayRevenue,
          orders: stats.todayOrders,
          units: stats.todaySales,
        };
    }
  };

  const currentStats = getCurrentStats();

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-primary">Sales Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name || user?.email}! Track your sales performance.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/sales")} className="gap-2">
              <Plus className="w-4 h-4" />
              New Sale
            </Button>
          </div>
        </div>

        {/* Time Filter */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Performance Metrics</CardTitle>
              <Select
                value={timeFilter}
                onValueChange={(value: any) => setTimeFilter(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Orders
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.orders}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeFilter === "today" && "Orders placed today"}
                    {timeFilter === "week" && "Orders this week"}
                    {timeFilter === "month" && "Orders this month"}
                    {timeFilter === "all" && "Total orders completed"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Units Sold
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.units}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeFilter === "today" && "Products sold today"}
                    {timeFilter === "week" && "Products sold this week"}
                    {timeFilter === "month" && "Products sold this month"}
                    {timeFilter === "all" && "Total products sold"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sales transactions found for this period.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/sales")}
                  >
                    Create Your First Sale
                  </Button>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.slice(0, 10).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(sale.saleDate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {sale.orderNumber || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sale.customerName}</div>
                              {sale.customerEmail && (
                                <div className="text-xs text-muted-foreground">
                                  {sale.customerEmail}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{sale.productName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{sale.quantity}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge>{sale.channel}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(sale.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredTransactions.length > 10 && (
                    <div className="text-center py-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/sales")}
                      >
                        View All Sales
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Best Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Best Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : bestSellingProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No sales data available yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bestSellingProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.quantity} units sold
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Out of Stock */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Badge variant="destructive" className="rounded-full px-2">
                          {inventoryAlerts.outOfStock.length}
                        </Badge>
                        Out of Stock
                      </h4>
                    </div>
                    {inventoryAlerts.outOfStock.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        All products in stock ✓
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {inventoryAlerts.outOfStock.slice(0, 5).map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 rounded border bg-destructive/5"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {product.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                SKU: {product.sku}
                              </div>
                            </div>
                            <Badge variant="destructive">0 qty</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Low Stock */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-full px-2">
                          {inventoryAlerts.lowStock.length}
                        </Badge>
                        Low Stock
                      </h4>
                    </div>
                    {inventoryAlerts.lowStock.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No low stock items
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {inventoryAlerts.lowStock.slice(0, 5).map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 rounded border bg-yellow-500/5"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {product.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                SKU: {product.sku}
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {product.quantity} left
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/sales")}
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm">Create Sale</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/invoices")}
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm">View Invoices</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
