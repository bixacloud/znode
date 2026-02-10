import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  MoreVertical,
  Eye,
  Settings,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { formatSuspendReason } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Hosting {
  id: string;
  vpUsername: string;
  username: string;
  domain: string;
  package: string;
  label: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  activatedAt: string | null;
  suspendReason: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const HostingList = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  usePageTitle(t.hosting?.title || 'Hosting');
  
  const getStatusBadge = (status: string) => {
    switch (status) {
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
  const { data, isLoading } = useQuery({
    queryKey: ["user-hostings"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting`, {
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
  const activeCount = hostings.filter(h => h.status !== 'DELETED').length;
  const canCreateMore = activeCount < 3;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.hosting.title}</h1>
            <p className="text-muted-foreground">
              {t.hostingList.manageAllHostings}
            </p>
          </div>
          {canCreateMore && (
            <Link to="/user/hosting/create">
              <Button>
                <Plus className="w-4 h-4" />
                {t.hosting.createNew}
              </Button>
            </Link>
          )}
        </div>

        {/* Accounts limit notice */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-foreground">
            <span className="font-medium">{t.hostingList.limit}:</span> {t.hostingList.usingAccounts}{" "}
            <span className="font-bold text-primary">{activeCount}</span>
            /3 {t.hostingList.freeHostingAccounts}.
            {!canCreateMore && ` ${t.hostingList.deleteOldToCreate}`}
          </p>
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
              {t.hosting.noHosting}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t.hosting.createFirst}
            </p>
            <Link to="/user/hosting/create">
              <Button>
                <Plus className="w-4 h-4" />
                {t.hosting.createNew}
              </Button>
            </Link>
          </div>
        ) : (
          /* Accounts table */
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                      {t.hostingList.hostingAccount}
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4 hidden md:table-cell">
                      {t.hosting.username}
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
                      onClick={() => navigate(`/user/hosting/${hosting.vpUsername}`)}
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
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                          {hosting.vpUsername}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(hosting.status)}
                        {hosting.status === 'SUSPENDED' && hosting.suspendReason && (
                          <p className="text-xs text-destructive mt-1">
                            {formatSuspendReason(hosting.suspendReason, t.hosting?.adminSuspended || "Admin suspended")}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(hosting.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/user/hosting/${hosting.vpUsername}`} className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                {t.hosting.viewDetails}
                              </Link>
                            </DropdownMenuItem>
                            {hosting.status === 'ACTIVE' && (
                              <DropdownMenuItem asChild>
                                <Link to={`/user/hosting/${hosting.vpUsername}/settings`} className="flex items-center gap-2">
                                  <Settings className="w-4 h-4" />
                                  {t.hosting.settings}
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HostingList;
