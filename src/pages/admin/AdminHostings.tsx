import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { formatSuspendReason } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Hosting {
  id: string;
  vpUsername: string;
  username: string;
  domain: string;
  package: string;
  label: string | null;
  status: string;
  suspendReason: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const AdminHostings = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  usePageTitle(t.admin?.hostings || 'Admin Hostings');

  const getStatusBadge = (hostingStatus: string) => {
    switch (hostingStatus) {
      case "ACTIVE":
        return (
          <span className="status-badge status-active">
            <CheckCircle className="w-3.5 h-3.5" />
            {t.hosting.active}
          </span>
        );
      case "PENDING":
        return (
          <span className="status-badge status-pending">
            <Clock className="w-3.5 h-3.5" />
            {t.hosting.pending}
          </span>
        );
      case "SUSPENDING":
        return (
          <span className="status-badge status-pending">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.hosting.suspending}
          </span>
        );
      case "REACTIVATING":
        return (
          <span className="status-badge status-pending">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.hosting.reactivating}
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="status-badge status-suspended">
            <AlertCircle className="w-3.5 h-3.5" />
            {t.hosting.suspended}
          </span>
        );
      case "DELETED":
        return (
          <span className="status-badge status-deactivated">
            <XCircle className="w-3.5 h-3.5" />
            {t.hosting.deleted}
          </span>
        );
      default:
        return null;
    }
  };

  // Fetch hosting accounts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-hostings", search, status, page],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status !== "all" && { status }),
      });
      
      const response = await fetch(`${API_URL}/api/admin/hostings?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch hostings");
      return response.json();
    },
    // Auto-refresh when there are hostings in pending/processing states
    refetchInterval: (query) => {
      const hostings = query.state.data?.hostings as Hosting[] | undefined;
      if (hostings?.some(h => 
        ['PENDING', 'SUSPENDING', 'REACTIVATING'].includes(h.status)
      )) {
        return 5000; // Refresh every 5 seconds when processing
      }
      return false;
    },
  });

  const hostings: Hosting[] = data?.hostings || [];
  const pagination: Pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.admin.manageHostings}</h1>
          <p className="text-muted-foreground">
            {t.admin.manageHostingsDesc}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.admin.searchHosting}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">{t.common.search}</Button>
          </form>
          
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.hosting.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="ACTIVE">{t.hosting.active}</SelectItem>
              <SelectItem value="PENDING">{t.hosting.pending}</SelectItem>
              <SelectItem value="SUSPENDED">{t.hosting.suspended}</SelectItem>
              <SelectItem value="DELETED">{t.hosting.deleted}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="text-sm text-muted-foreground">
          {t.admin.showingResults.replace('{count}', pagination.total.toString())}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="rounded-2xl bg-card border border-border p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : hostings.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl bg-card border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t.admin.noHostingsFound}
            </h3>
            <p className="text-muted-foreground">
              {t.admin.noHostingsFoundDesc}
            </p>
          </div>
        ) : (
          /* Accounts table */
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      {t.hosting.domain}
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 hidden md:table-cell">
                      {t.admin.owner}
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      {t.hosting.status}
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 hidden lg:table-cell">
                      {t.hosting.createdAt}
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      {t.common.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hostings.map((hosting) => (
                    <tr 
                      key={hosting.id} 
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/hostings/${hosting.vpUsername}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                            <Server className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {hosting.label || hosting.domain}
                            </p>
                            <span 
                              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://${hosting.domain}`, '_blank');
                              }}
                            >
                              {hosting.domain}
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {hosting.user.name || hosting.user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hosting.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(hosting.status)}
                        {hosting.status === 'SUSPENDED' && hosting.suspendReason && (
                          <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={formatSuspendReason(hosting.suspendReason, t.admin?.adminSuspended || "Admin suspended")}>
                            {formatSuspendReason(hosting.suspendReason, t.admin?.adminSuspended || "Admin suspended")}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(hosting.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/hostings/${hosting.vpUsername}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {t.admin.pageOf.replace('{page}', pagination.page.toString()).replace('{total}', pagination.totalPages.toString())}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminHostings;
