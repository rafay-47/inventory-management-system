"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/authContext";
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/axiosInstance";
import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Skeleton as UISkeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  errorMessage: string | null;
  metadata: any;
  createdAt: string;
}

interface Stats {
  period: string;
  totalLogs: number;
  logsByAction: Array<{ action: string; count: number }>;
  logsByEntity: Array<{ entityType: string; count: number }>;
  logsByStatus: Array<{ status: string; count: number }>;
  mostActiveUsers: Array<{ userId: string; userName: string; count: number }>;
  recentFailures: Array<any>;
  dailyActivity: Array<{ date: string; count: number }>;
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    
    const isAdmin = user?.roles?.includes("admin");
    if (!isAdmin) {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityTypeFilter, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (actionFilter && actionFilter !== "ALL") params.action = actionFilter;
      if (entityTypeFilter && entityTypeFilter !== "ALL") params.entityType = entityTypeFilter;
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;

      const response = await axiosInstance.get("/audit-logs", { params });
      setLogs(response.data.logs);
      setTotal(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await axiosInstance.get("/audit-logs/stats", {
        params: { period: "7d" },
      });
      setStats(response.data);
    } catch (err: any) {
      console.error("Failed to fetch stats:", err);
      // Don't show error to user, just log it
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    setSearch("");
    setActionFilter("");
    setEntityTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
        return "destructive";
      case "LOGIN":
        return "outline";
      case "LOGOUT":
        return "outline";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!user?.roles?.includes("admin")) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">
              Complete activity history and system audit trail
            </p>
          </div>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <UISkeleton key={i} className="h-32" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.logsByAction[0]?.action || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.logsByAction[0]?.count || 0} occurrences
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.mostActiveUsers.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Top: {stats.mostActiveUsers[0]?.userName || "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.recentFailures.length}
              </div>
              <p className="text-xs text-muted-foreground">Recent failures</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex gap-2 md:col-span-2">
              <Input
                placeholder="Search by user, email, entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Select value={actionFilter || undefined} onValueChange={(value) => setActionFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="LOGIN">LOGIN</SelectItem>
                <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                <SelectItem value="VIEW">VIEW</SelectItem>
                <SelectItem value="EXPORT">EXPORT</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityTypeFilter || undefined} onValueChange={(value) => setEntityTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Entities</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Category">Category</SelectItem>
                <SelectItem value="Supplier">Supplier</SelectItem>
                <SelectItem value="Order">Order</SelectItem>
                <SelectItem value="PurchaseOrder">Purchase Order</SelectItem>
                <SelectItem value="User">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleReset} variant="outline">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Showing {logs.length} of {total} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <UISkeleton key={i} className="h-16" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{log.userName || "Unknown"}</div>
                          <div className="text-muted-foreground text-xs">
                            {log.userEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionColor(log.action) as any}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.entityType && (
                          <div className="text-sm">
                            <div className="font-medium">{log.entityType}</div>
                            <div className="text-muted-foreground text-xs">
                              {log.entityName}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="text-sm capitalize">{log.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ipAddress || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Audit Log Details</CardTitle>
              <CardDescription>{formatDate(selectedLog.createdAt)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">User</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.userName} ({selectedLog.userEmail})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Action</p>
                  <Badge variant={getActionColor(selectedLog.action) as any}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Entity Type</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.entityType || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Entity Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.entityName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedLog.status)}
                    <span className="text-sm capitalize">{selectedLog.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">IP Address</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.ipAddress || "N/A"}
                  </p>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <p className="text-sm font-medium text-red-500">Error Message</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}

              {selectedLog.oldValues && (
                <div>
                  <p className="text-sm font-medium">Old Values</p>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <p className="text-sm font-medium">New Values</p>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm font-medium">User Agent</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setSelectedLog(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </AuthenticatedLayout>
  );
}
