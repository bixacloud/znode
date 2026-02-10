import { useEffect, useState } from "react";
import { Users, HardDrive, TrendingUp, Shield, Activity, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import AdminLayout from "@/components/admin/AdminLayout";
import DataImportPopup from "@/components/admin/DataImportPopup";
import authService from "@/services/auth";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Stats {
  totalUsers: number;
  totalAdmins: number;
  recentUsers: number;
  totalHostings: number;
  activeHostings: number;
  suspendedHostings: number;
}

interface HealthCheck {
  status: 'online' | 'offline' | 'unconfigured';
  latency?: number;
  message?: string;
}

interface HealthData {
  overall: 'healthy' | 'degraded' | 'partial';
  checks: Record<string, HealthCheck>;
  timestamp: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const { t } = useLanguage();
  usePageTitle(t.admin?.dashboard || 'Admin Dashboard');

  useEffect(() => {
    loadStats();
    loadHealth();
  }, []);

  const loadStats = async () => {
    try {
      const response = await authService.getAdminStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const resp = await fetch(`${API_URL}/api/admin/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        setHealth(await resp.json());
      }
    } catch (error) {
      console.error('Failed to load health:', error);
    } finally {
      setHealthLoading(false);
    }
  };

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'unconfigured':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/15">{t.admin?.statusOnline || 'Online'}</Badge>;
      case 'offline':
        return <Badge variant="destructive">{t.admin?.statusOffline || 'Offline'}</Badge>;
      case 'unconfigured':
        return <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/15">{t.admin?.statusUnconfigured || 'Not Configured'}</Badge>;
    }
  };

  const getOverallBadge = (overall: HealthData['overall']) => {
    switch (overall) {
      case 'healthy':
        return <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/15">● {t.admin?.systemHealthy || 'All Systems Operational'}</Badge>;
      case 'degraded':
        return <Badge variant="destructive">● {t.admin?.systemDegraded || 'System Degraded'}</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/15">● {t.admin?.systemPartial || 'Partial Configuration'}</Badge>;
    }
  };

  const serviceLabels: Record<string, string> = {
    api: 'API Server',
    database: t.admin?.database || 'Database',
    mofh: 'MOFH API',
    smtp: t.admin?.smtp || 'SMTP',
    cloudflare: 'Cloudflare',
  };

  return (
    <AdminLayout>
      <DataImportPopup />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.admin.dashboard}</h1>
          <p className="text-muted-foreground">{t.admin.systemOverview}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.totalUsers}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.admin.registeredUsers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.admins}</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.totalAdmins || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.admin.administrators}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.newUsers}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.recentUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.admin.last7Days}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.admin.hostingAccounts}</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stats?.totalHostings || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.admin.activeHostings || 'Active'}: {stats?.activeHostings || 0} | {t.admin.suspendedHostings || 'Suspended'}: {stats?.suspendedHostings || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{t.admin?.systemHealth || 'System Health'}</CardTitle>
                  <CardDescription>
                    {t.admin?.serverStatus || 'Server Status'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {health && getOverallBadge(health.overall)}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadHealth}
                  disabled={healthLoading}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {healthLoading && !health ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : health ? (
              <div className="space-y-1">
                {Object.entries(health.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium text-sm">{serviceLabels[key] || key}</p>
                        <p className="text-xs text-muted-foreground">{check.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {check.latency !== undefined && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {check.latency}ms
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.admin?.responseTime || 'Response time'}: {check.latency}ms</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {getStatusBadge(check.status)}
                    </div>
                  </div>
                ))}
                {health.timestamp && (
                  <p className="text-xs text-muted-foreground text-right pt-2 border-t mt-2">
                    {t.admin?.lastChecked || 'Last checked'}: {new Date(health.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t.admin?.healthCheckFailed || 'Failed to load health status'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
