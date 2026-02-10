import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  HardDrive,
  ArrowUpRight,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Shield,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatSuspendReason } from "@/lib/utils";

interface Hosting {
  id: string;
  vpUsername: string;
  username: string;
  domain: string;
  package: string;
  label: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";
  suspendReason: string | null;
  createdAt: string;
}

interface HostingStats {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  limit: number;
  canCreate: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const Dashboard = () => {
  const { t } = useLanguage();
  usePageTitle(t.common?.dashboard || 'Dashboard');

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
  const { data: hostingsData, isLoading: loadingHostings } = useQuery({
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
  });

  // Fetch hosting stats
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ["hosting-stats"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/stats/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // Fetch SSL certificates count
  const { data: sslData } = useQuery({
    queryKey: ["user-ssl-count"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/ssl/certificates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return { certificates: [] };
      return response.json();
    },
  });

  // Fetch tickets count
  const { data: ticketsData } = useQuery({
    queryKey: ["user-tickets-count"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/tickets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return { tickets: [] };
      return response.json();
    },
  });

  const hostings: Hosting[] = hostingsData?.hostings?.filter((h: Hosting) => h.status !== 'DELETED') || [];
  const stats: HostingStats = statsData || { total: 0, active: 0, pending: 0, suspended: 0, limit: 3, canCreate: true };
  const sslCount = sslData?.certificates?.length || 0;
  const ticketCount = ticketsData?.tickets?.filter((t: any) => t.status !== 'CLOSED')?.length || 0;

  const isLoading = loadingHostings || loadingStats;

  const statsCards = [
    { 
      label: t.dashboard.hostingAccounts, 
      value: stats.total.toString(), 
      max: stats.limit > 0 ? stats.limit.toString() : undefined, 
      icon: HardDrive,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    { 
      label: t.dashboard.sslCertificates || "SSL Certificates", 
      value: sslCount.toString(), 
      icon: Shield,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    { 
      label: t.dashboard.openTickets || "Open Tickets", 
      value: ticketCount.toString(), 
      icon: MessageSquare,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.dashboard.title}</h1>
            <p className="text-muted-foreground">
              {t.dashboard.overview}
            </p>
          </div>
          {stats.canCreate && (
            <Link to="/user/hosting/create">
              <Button>
                <Plus className="w-4 h-4" />
                {t.hosting.createNew}
              </Button>
            </Link>
          )}
        </div>

        {/* Stats cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border border-border animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-muted mb-4" />
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statsCards.map((stat) => (
              <div
                key={stat.label}
                className="p-6 rounded-2xl bg-card border border-border card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {stat.value}
                  {stat.max && <span className="text-muted-foreground font-normal"> / {stat.max}</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Hosting accounts */}
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">
              {t.dashboard.recentHostings}
            </h2>
            <Link to="/user/hosting" className="text-sm text-primary hover:underline flex items-center gap-1">
              {t.dashboard.viewAll}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : hostings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Server className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t.dashboard.noHostings}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t.dashboard.createFirst}
              </p>
              <Link to="/user/hosting/create">
                <Button>
                  <Plus className="w-4 h-4" />
                  {t.dashboard.createHosting}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {hostings.slice(0, 5).map((hosting) => (
                <Link
                  key={hosting.id}
                  to={`/user/hosting/${hosting.vpUsername}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Server className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {hosting.label || hosting.domain}
                      </h3>
                      {getStatusBadge(hosting.status)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {hosting.domain}
                    </p>
                    {hosting.status === 'SUSPENDED' && hosting.suspendReason && (
                      <p className="text-xs text-destructive mt-1 truncate">
                        {formatSuspendReason(hosting.suspendReason, t.hosting?.adminSuspended || "Admin suspended")}
                      </p>
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">{t.hosting.username}</p>
                      <p className="text-sm font-mono">
                        {hosting.vpUsername}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">{t.hosting.createdAt}</p>
                      <p className="text-sm">
                        {new Date(hosting.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
