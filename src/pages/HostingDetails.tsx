import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  Monitor,
  Folder,
  Box,
  Settings,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Globe,
  ArrowLeft,
  Shield,
  Zap,
  Loader2,
  Eye,
  EyeOff,
  Database,
  Trash2,
  HardDrive,
  Wifi,
  FileText,
  Activity,
  Power,
  Palette,
  Crown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { formatSuspendReason, isSuspendedByAdmin } from "@/lib/utils";

interface Hosting {
  id: string;
  vpUsername: string;
  username: string;
  password: string | null;
  domain: string;
  package: string;
  label: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";
  sqlCluster: string | null;
  suspendReason: string | null;
  createdAt: string;
  activatedAt: string | null;
  suspendedAt: string | null;
  cpanelApproved: boolean;
  cpanelApprovedAt: string | null;
  isCustomDomain: boolean;
}

interface AccountStats {
  disk?: { used: number; total: number | string; percent: number; unit: string };
  bandwidth?: { used: number; total: number | string; percent: number; unit: string };
  inodes?: { used: number; total: number | string; percent: number; unit: string };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const HostingDetails = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.hosting?.details || 'Hosting Details');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingSoftaculous, setIsLoadingSoftaculous] = useState(false);
  const [isLoadingFileManager, setIsLoadingFileManager] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isLoadingSitePro, setIsLoadingSitePro] = useState(false);
  const [siteProEnabled, setSiteProEnabled] = useState(false);
  
  // Database states
  const [dbName, setDbName] = useState('');
  const [isCreatingDb, setIsCreatingDb] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [deletingDb, setDeletingDb] = useState<string | null>(null);
  const [loadingPmaDb, setLoadingPmaDb] = useState<string | null>(null);
  const [dbQuota, setDbQuota] = useState<string | null>(null); // e.g., "1 / 3"
  
  // Stats states
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch hosting details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["hosting-details", username],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Hosting not found");
        }
        throw new Error("Failed to fetch hosting details");
      }
      return response.json();
    },
    // Auto-refresh when hosting is in pending/processing state
    refetchInterval: (query) => {
      const hosting = query.state.data?.hosting;
      if (hosting && ['PENDING', 'SUSPENDING', 'REACTIVATING'].includes(hosting.status)) {
        return 3000; // Refresh every 3 seconds when processing
      }
      return false;
    },
  });

  const hosting: Hosting | null = data?.hosting || null;
  const cpanelUrl = data?.cpanelUrl || 'https://cpanel.byethost.com';
  const firstAllowedDomain = data?.firstAllowedDomain || '';
  
  // Track if we've already synced to avoid duplicate calls
  const hasSyncedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Website Builder is enabled
  useEffect(() => {
    const checkBuilder = async () => {
      try {
        const response = await fetch(`${API_URL}/api/builder/status`);
        const data = await response.json();
        setSiteProEnabled(data.enabled);
      } catch {
        setSiteProEnabled(false);
      }
    };
    checkBuilder();
  }, []);

  // Auto-sync when hosting is PENDING, SUSPENDING, or REACTIVATING
  useEffect(() => {
    const needsPolling = hosting && (
      hosting.status === 'PENDING' || 
      hosting.status === 'SUSPENDING' || 
      hosting.status === 'REACTIVATING'
    );
    
    // Only auto-sync once when page loads and needs polling
    if (needsPolling && !hasSyncedRef.current && !isSyncing) {
      hasSyncedRef.current = true;
      handleSync(false); // Don't show toast on auto-sync
    }
    
    // Set up polling every 10 seconds while in transitional states
    if (needsPolling) {
      pollIntervalRef.current = setInterval(() => {
        if (!isSyncing) {
          handleSync(false); // Don't show toast on polling
        }
      }, 10000); // Poll every 10 seconds
    }
    
    // Reset hasSyncedRef when status changes to a polling state
    if (needsPolling) {
      hasSyncedRef.current = false;
    }
    
    // Cleanup polling when status changes or component unmounts
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hosting?.status]);

  // Sync hosting status from MOFH
  const handleSync = async (showToast = true) => {
    if (!hosting) return;
    
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${hosting.vpUsername}/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      // Handle different status transitions
      if (result.success && result.status === 'ACTIVE') {
        // Clear polling when activated
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (showToast) {
          const wasReactivating = hosting.status === 'REACTIVATING';
          toast({
            title: wasReactivating ? t.hosting.reactivated : t.hosting.activated,
            description: wasReactivating ? t.hosting.reactivatedDesc : t.hosting.activatedDesc,
          });
        }
        // Auto reload page after status change
        setTimeout(() => window.location.reload(), 1500);
      } else if (result.success && result.status === 'SUSPENDED') {
        // Clear polling when fully suspended
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (showToast) {
          toast({
            title: t.hosting.suspended,
            description: t.hosting.suspendedDesc,
          });
        }
        // Auto reload page after status change
        setTimeout(() => window.location.reload(), 1500);
      } else {
        // Always refetch to get latest data (e.g., SQL cluster)
        refetch();
        if (showToast) {
          toast({
            title: t.hosting.notActivated,
            description: result.message || t.hosting.notActivatedDesc,
            variant: "default",
          });
        }
      }
    } catch (error) {
      if (showToast) {
        toast({
          title: t.hosting.syncError,
          description: t.hosting.syncErrorDesc,
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Softaculous auto-login
  const handleOpenSoftaculous = async () => {
    if (!hosting) return;
    
    setIsLoadingSoftaculous(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/vistapanel/${hosting.vpUsername}/softaculous`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (result.link) {
        // Open Softaculous in new tab
        window.open(result.link, '_blank');
        toast({
          title: t.hosting.softaculousOpened,
          description: t.hosting.softaculousOpenedDesc,
        });
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.hosting.softaculousError,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.messages.error,
        description: t.hosting.cannotConnect,
        variant: "destructive",
      });
    } finally {
      setIsLoadingSoftaculous(false);
    }
  };

  // Open File Manager
  const handleOpenFileManager = async () => {
    if (!hosting) return;
    
    setIsLoadingFileManager(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${hosting.vpUsername}/filemanager`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (result.link) {
        // Open File Manager in new tab
        window.open(result.link, '_blank');
        toast({
          title: t.hosting.fileManagerOpened,
          description: t.hosting.fileManagerOpenedDesc,
        });
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.hosting.fileManagerError,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.messages.error,
        description: t.hosting.cannotConnect,
        variant: "destructive",
      });
    } finally {
      setIsLoadingFileManager(false);
    }
  };

  // Open Website Builder (VvvebJs)
  const handleOpenSitePro = () => {
    if (!hosting) return;
    navigate(`/user/hosting/${hosting.vpUsername}/builder`);
  };

  // Reactivate suspended hosting
  const handleReactivate = async () => {
    if (!hosting) return;
    
    setIsReactivating(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${hosting.vpUsername}/reactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: t.hosting.reactivateStarted,
          description: t.hosting.reactivateStartedDesc,
        });
        // Refetch hosting details to update status
        refetch();
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.hosting.reactivateFailed,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.messages.error,
        description: t.hosting.cannotConnect,
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  // Fetch databases list
  const fetchDatabases = async (sync: boolean = false) => {
    if (!hosting || hosting.status !== 'ACTIVE') return;
    
    setIsLoadingDatabases(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = sync 
        ? `${API_URL}/api/vistapanel/${hosting.vpUsername}/databases?sync=true`
        : `${API_URL}/api/vistapanel/${hosting.vpUsername}/databases`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.databases) {
        setDatabases(result.databases);
        if (sync && result.synced) {
          toast({
            title: t.hosting.synced,
            description: t.hosting.syncedDesc,
          });
        }
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.hosting.fetchDbError,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.messages.error,
        description: t.hosting.cannotConnect,
        variant: "destructive",
      });
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  // Fetch database quota from stats
  const fetchDbQuota = async () => {
    if (!hosting || hosting.status !== 'ACTIVE') return;
    
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/vistapanel/${hosting.vpUsername}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.stats) {
        // MySQL Databases: format is like "1 / 3" or just "1"
        const dbStats = result.stats['MySQL Databases:'] || result.stats['MySQL Databases'];
        if (dbStats) {
          setDbQuota(dbStats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch DB quota:', error);
    }
  };

  // Fetch account stats (disk, bandwidth, inodes)
  const fetchAccountStats = async () => {
    if (!hosting || hosting.status !== 'ACTIVE') return;
    
    console.log('[STATS] Fetching account stats for', hosting.vpUsername);
    setIsLoadingStats(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/vistapanel/${hosting.vpUsername}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      console.log('[STATS] API response:', result);
      
      if (response.ok && result.stats) {
        const stats = result.stats;
        console.log('[STATS] Raw stats:', stats);
        
        // Parse disk usage: "0 MB\n..." and disk quota: "5 GB"
        const parseDiskUsage = (): { used: number; total: number | string; percent: number; unit: string } | null => {
          const diskUsedRaw = stats['Disk Space Used:'];
          const diskQuotaRaw = stats['Disk Quota:'];
          
          if (!diskUsedRaw && !diskQuotaRaw) return null;
          
          // Parse used: "0 MB\n                0" -> 0 MB
          let used = 0;
          let unit = 'MB';
          if (diskUsedRaw) {
            const usedMatch = diskUsedRaw.match(/([\d,.]+)\s*(MB|GB|KB)/i);
            if (usedMatch) {
              used = parseFloat(usedMatch[1].replace(/,/g, ''));
              unit = usedMatch[2].toUpperCase();
            }
          }
          
          // Parse quota: "5 GB" or "Unlimited"
          let total: number | string = 'Unlimited';
          if (diskQuotaRaw) {
            if (diskQuotaRaw.toLowerCase().includes('unlimited')) {
              total = 'Unlimited';
            } else {
              const quotaMatch = diskQuotaRaw.match(/([\d,.]+)\s*(MB|GB|KB)/i);
              if (quotaMatch) {
                let quotaValue = parseFloat(quotaMatch[1].replace(/,/g, ''));
                const quotaUnit = quotaMatch[2].toUpperCase();
                // Convert to same unit as used
                if (quotaUnit === 'GB' && unit === 'MB') {
                  quotaValue = quotaValue * 1024;
                } else if (quotaUnit === 'MB' && unit === 'GB') {
                  quotaValue = quotaValue / 1024;
                }
                total = quotaValue;
              }
            }
          }
          
          const percent = typeof total === 'number' && total > 0 
            ? Math.round((used / total) * 100) 
            : 0;
          
          return { used, total, percent, unit };
        };
        
        // Parse bandwidth: "0 MB" and "Unlimited"
        const parseBandwidth = (): { used: number; total: number | string; percent: number; unit: string } | null => {
          const bwUsedRaw = stats['Bandwidth used:'];
          const bwTotalRaw = stats['Bandwidth:'];
          
          if (!bwUsedRaw) return null;
          
          // Parse used: "0 MB\n..." -> 0 MB
          let used = 0;
          let unit = 'MB';
          const usedMatch = bwUsedRaw.match(/([\d,.]+)\s*(MB|GB|KB)/i);
          if (usedMatch) {
            used = parseFloat(usedMatch[1].replace(/,/g, ''));
            unit = usedMatch[2].toUpperCase();
          }
          
          // Parse total
          let total: number | string = 'Unlimited';
          if (bwTotalRaw && !bwTotalRaw.toLowerCase().includes('unlimited')) {
            const totalMatch = bwTotalRaw.match(/([\d,.]+)\s*(MB|GB|KB)/i);
            if (totalMatch) {
              total = parseFloat(totalMatch[1].replace(/,/g, ''));
            }
          }
          
          const percent = typeof total === 'number' && total > 0 
            ? Math.round((used / total) * 100) 
            : 0;
          
          return { used, total, percent, unit };
        };
        
        // Parse inodes: "0 % (0 of 80000)"
        const parseInodes = (): { used: number; total: number | string; percent: number; unit: string } | null => {
          const inodesRaw = stats['Inodes Used:'];
          if (!inodesRaw) return null;
          
          // Format: "0 % (0 of 80000)"
          const match = inodesRaw.match(/([\d,.]+)\s*%\s*\(([\d,.]+)\s*of\s*([\d,.]+)\)/i);
          if (match) {
            const percent = parseFloat(match[1]);
            const used = parseFloat(match[2].replace(/,/g, ''));
            const total = parseFloat(match[3].replace(/,/g, ''));
            return { used, total, percent, unit: '' };
          }
          
          return null;
        };
        
        const newStats: AccountStats = {};
        
        // Parse all stats
        const disk = parseDiskUsage();
        if (disk) newStats.disk = disk;
        
        const bandwidth = parseBandwidth();
        if (bandwidth) newStats.bandwidth = bandwidth;
        
        const inodes = parseInodes();
        if (inodes) newStats.inodes = inodes;
        
        console.log('[STATS] Parsed stats:', newStats);
        setAccountStats(newStats);
      }
    } catch (error) {
      console.error('Failed to fetch account stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Auto-load databases when hosting is ACTIVE
  useEffect(() => {
    if (hosting && hosting.status === 'ACTIVE') {
      fetchDatabases();
      fetchDbQuota();
      fetchAccountStats();
    }
  }, [hosting?.id, hosting?.status]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: t.hosting.copied,
      description: `${field} ${t.hosting.copiedToClipboard}`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          label: t.hosting.active,
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          dotColor: "bg-emerald-500",
          icon: CheckCircle,
        };
      case "PENDING":
        return {
          label: t.hosting.pendingWaitingActivation,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          dotColor: "bg-amber-500",
          icon: Clock,
        };
      case "SUSPENDING":
        return {
          label: t.hosting.suspending,
          color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
          dotColor: "bg-orange-500",
          icon: Clock,
        };
      case "SUSPENDED":
        return {
          label: t.hosting.suspended,
          color: "bg-red-500/10 text-red-600 dark:text-red-400",
          dotColor: "bg-red-500",
          icon: AlertCircle,
        };
      case "REACTIVATING":
        return {
          label: t.hosting.reactivating,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          dotColor: "bg-blue-500",
          icon: Clock,
        };
      case "DELETED":
        return {
          label: t.hosting.deleted,
          color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
          dotColor: "bg-gray-500",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: "bg-gray-500/10 text-gray-600",
          dotColor: "bg-gray-500",
          icon: Clock,
        };
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !hosting) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Link
            to="/user/hosting"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t.hosting.backToList}
          </Link>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.hosting.notFound}</AlertTitle>
            <AlertDescription>
              {t.hosting.notFoundDesc}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = getStatusInfo(hosting.status);
  const StatusIcon = statusInfo.icon;

  // Determine which button to show based on status
  const getLastAction = () => {
    // SUSPENDING: Show waiting/syncing button
    if (hosting.status === 'SUSPENDING') {
      return {
        label: t.hosting.suspending,
        icon: Loader2,
        href: '#',
        external: false,
        color: "from-orange-500 to-red-500",
        description: t.hosting.suspendingDesc,
        disabled: true,
        onClick: null,
        loading: true,
      };
    }
    // REACTIVATING: Show waiting button
    if (hosting.status === 'REACTIVATING') {
      return {
        label: t.hosting.reactivating,
        icon: Loader2,
        href: '#',
        external: false,
        color: "from-blue-500 to-cyan-500",
        description: t.hosting.reactivatingDesc,
        disabled: true,
        onClick: null,
        loading: true,
      };
    }
    // SUSPENDED: Show reactivate button (only if not suspended by admin)
    if (hosting.status === 'SUSPENDED') {
      const suspendedByAdmin = isSuspendedByAdmin(hosting.suspendReason);
      if (suspendedByAdmin) {
        // Suspended by admin - user cannot reactivate
        return {
          label: t.hosting.contactSupport,
          icon: AlertCircle,
          href: '/user/tickets',
          external: false,
          color: "from-red-500 to-orange-500",
          description: t.hosting.suspendedByAdminDesc,
          disabled: false,
          onClick: null,
          loading: false,
        };
      }
      return {
        label: t.hosting.reactivate,
        icon: isReactivating ? Loader2 : Power,
        href: '#',
        external: false,
        color: "from-emerald-500 to-green-500",
        description: t.hosting.reactivateDesc,
        disabled: isReactivating,
        onClick: handleReactivate,
        loading: isReactivating,
      };
    }
    // ACTIVE or others: Show settings button
    return {
      label: t.hosting.settings, 
      icon: Settings, 
      href: `/user/hosting/${hosting.vpUsername}/settings`, 
      external: false,
      color: "from-emerald-500 to-green-500", 
      description: t.hosting.accountSettings,
      disabled: hosting.status !== 'ACTIVE',
      onClick: null,
      loading: false,
    };
  };

  const quickActions = [
    { 
      label: "Control Panel", 
      icon: Monitor, 
      href: `/user/hosting/${hosting.vpUsername}/cpanel`, 
      external: false,
      color: "from-violet-500 to-indigo-500", 
      description: t.hosting.manageHosting,
      disabled: hosting.status !== 'ACTIVE',
      onClick: null,
      loading: false,
    },
    { 
      label: t.hosting.fileManager, 
      icon: isLoadingFileManager ? Loader2 : Folder, 
      href: '#',
      external: false,
      color: "from-cyan-500 to-blue-500", 
      description: t.hosting.manageFiles,
      disabled: hosting.status !== 'ACTIVE' || isLoadingFileManager,
      onClick: handleOpenFileManager,
      loading: isLoadingFileManager,
    },
    { 
      label: "Softaculous", 
      icon: isLoadingSoftaculous ? Loader2 : Box, 
      href: '#',
      external: false,
      color: "from-amber-500 to-orange-500", 
      description: t.hosting.installApps,
      disabled: hosting.status !== 'ACTIVE' || isLoadingSoftaculous,
      onClick: handleOpenSoftaculous,
      loading: isLoadingSoftaculous,
    },
    getLastAction(),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back link */}
        <Link
          to="/user/hosting"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t.hosting.backToList}
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Server className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {hosting.label || hosting.domain}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusInfo.color} text-sm font-medium`}>
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor} ${hosting.status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
                  {statusInfo.label}
                </span>
              </div>
              <a
                href={`https://${hosting.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors mt-1"
              >
                <Globe className="w-4 h-4" />
                {hosting.domain}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.hosting.refresh}
            </Button>
            {hosting.status === 'ACTIVE' && (
              <Link to={`/user/hosting/${hosting.vpUsername}/upgrade`}>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white">
                  <Crown className="w-4 h-4 mr-2" />
                  {t.hosting?.upgrade || 'Upgrade'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {hosting.status === 'PENDING' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>{t.hosting.pendingActivation}</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              <span>
                {t.hosting.pendingActivationDesc}
              </span>
              {isSyncing && <Loader2 className="w-4 h-4 animate-spin" />}
            </AlertDescription>
          </Alert>
        )}

        {hosting.status === 'SUSPENDED' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.hosting.accountSuspended}</AlertTitle>
            <AlertDescription>
              {formatSuspendReason(hosting.suspendReason, t.hosting?.adminSuspended || "Admin suspended") || t.hosting.accountSuspendedDesc}
            </AlertDescription>
          </Alert>
        )}

        {/* cPanel Approval Required Alert */}
        {hosting.status === 'ACTIVE' && !hosting.cpanelApproved && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Shield className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">{t.hosting?.cpanelApprovalRequired || "cPanel Approval Required"}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {t.hosting?.cpanelApprovalDesc || "You must login to cPanel at least once to activate all features. Click 'Login to cPanel' button below to complete this step."}
              <div className="mt-3">
                <Link to={`/user/hosting/${hosting.vpUsername}/cpanel`}>
                  <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white">
                    <Monitor className="w-4 h-4 mr-2" />
                    {t.hosting?.loginToCpanel || "Login to cPanel"}
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            {t.hosting.quickActions}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              // If has onClick, use button/div
              if (action.onClick) {
                return (
                  <button
                    key={action.label}
                    onClick={action.disabled ? undefined : action.onClick}
                    disabled={action.disabled}
                    className={`group relative overflow-hidden p-6 rounded-2xl bg-card border border-border transition-all duration-300 text-left ${
                      action.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:border-transparent hover:shadow-xl hover:-translate-y-1'
                    }`}
                  >
                    {/* Gradient background on hover */}
                    {!action.disabled && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    )}
                    
                    <div className="relative z-10">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} p-[1px] mb-4`}>
                        <div className={`w-full h-full rounded-xl bg-card ${!action.disabled ? 'group-hover:bg-transparent' : ''} flex items-center justify-center transition-colors`}>
                          <action.icon className={`w-6 h-6 text-foreground ${!action.disabled ? 'group-hover:text-white' : ''} transition-colors ${action.loading ? 'animate-spin' : ''}`} />
                        </div>
                      </div>
                      <h3 className={`font-semibold text-foreground ${!action.disabled ? 'group-hover:text-white' : ''} transition-colors`}>
                        {action.loading ? t.hosting.opening : action.label}
                      </h3>
                      <p className={`text-sm text-muted-foreground ${!action.disabled ? 'group-hover:text-white/70' : ''} transition-colors mt-1`}>
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              }

              // Otherwise use Link or anchor
              const ActionWrapper = action.external ? 'a' : Link;
              const actionProps = action.external 
                ? { href: action.disabled ? '#' : action.href, target: '_blank', rel: 'noopener noreferrer' }
                : { to: action.disabled ? '#' : action.href };

              return (
                <ActionWrapper
                  key={action.label}
                  {...actionProps as any}
                  className={`group relative overflow-hidden p-6 rounded-2xl bg-card border border-border transition-all duration-300 ${
                    action.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:border-transparent hover:shadow-xl hover:-translate-y-1'
                  }`}
                  onClick={action.disabled ? (e: any) => e.preventDefault() : undefined}
                >
                  {/* Gradient background on hover */}
                  {!action.disabled && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  )}
                  
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} p-[1px] mb-4`}>
                      <div className={`w-full h-full rounded-xl bg-card ${!action.disabled ? 'group-hover:bg-transparent' : ''} flex items-center justify-center transition-colors`}>
                        <action.icon className={`w-6 h-6 text-foreground ${!action.disabled ? 'group-hover:text-white' : ''} transition-colors`} />
                      </div>
                    </div>
                    <h3 className={`font-semibold text-foreground ${!action.disabled ? 'group-hover:text-white' : ''} transition-colors`}>
                      {action.label}
                    </h3>
                    <p className={`text-sm text-muted-foreground ${!action.disabled ? 'group-hover:text-white/70' : ''} transition-colors mt-1`}>
                      {action.description}
                    </p>
                  </div>
                </ActionWrapper>
              );
            })}
          </div>
        </div>

        {/* Stats Cards - Only show for ACTIVE accounts */}
        {hosting.status === 'ACTIVE' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              {t.hosting.usageStats}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={fetchAccountStats}
                disabled={isLoadingStats}
              >
                {isLoadingStats ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Disk Usage */}
              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Disk Space</p>
                    {isLoadingStats ? (
                      <div className="h-8 flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : accountStats?.disk ? (
                      <>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(accountStats.disk.percent, 100)}%` }}
                          />
                        </div>
                        <p className="text-sm font-medium">
                          {accountStats.disk.used.toLocaleString()} {accountStats.disk.unit}
                          <span className="text-muted-foreground">
                            {' / '}
                            {accountStats.disk.total === 'Unlimited' 
                              ? 'Unlimited' 
                              : `${(accountStats.disk.total as number).toLocaleString()} ${accountStats.disk.unit}`
                            }
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({accountStats.disk.percent}%)
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t.hosting.noData}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bandwidth */}
              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Bandwidth</p>
                    {isLoadingStats ? (
                      <div className="h-8 flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : accountStats?.bandwidth ? (
                      <>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(accountStats.bandwidth.percent, 100)}%` }}
                          />
                        </div>
                        <p className="text-sm font-medium">
                          {accountStats.bandwidth.used.toLocaleString()} {accountStats.bandwidth.unit}
                          <span className="text-muted-foreground">
                            {' / '}
                            {accountStats.bandwidth.total === 'Unlimited' 
                              ? 'Unlimited' 
                              : `${(accountStats.bandwidth.total as number).toLocaleString()} ${accountStats.bandwidth.unit}`
                            }
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({accountStats.bandwidth.percent}%)
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t.hosting.noData}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inodes */}
              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">Inodes</p>
                    {isLoadingStats ? (
                      <div className="h-8 flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : accountStats?.inodes ? (
                      <>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(accountStats.inodes.percent, 100)}%` }}
                          />
                        </div>
                        <p className="text-sm font-medium">
                          {accountStats.inodes.used.toLocaleString()}
                          <span className="text-muted-foreground">
                            {' / '}
                            {accountStats.inodes.total === 'Unlimited' 
                              ? 'Unlimited' 
                              : (accountStats.inodes.total as number).toLocaleString()
                            }
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({accountStats.inodes.percent}%)
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t.hosting.noData}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account credentials */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                {t.hosting.accountInfo}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {/* Domain */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Domain</p>
                  <code className="text-sm font-mono text-foreground">{hosting.domain}</code>
                </div>
                <div className="flex items-center gap-2">
                  {/* Website Builder Button */}
                  {siteProEnabled && hosting.status === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-pink-600 border-pink-300 hover:bg-pink-600 hover:text-white hover:border-pink-600 dark:text-pink-400 dark:border-pink-800 dark:hover:bg-pink-600 dark:hover:text-white dark:hover:border-pink-600"
                      onClick={handleOpenSitePro}
                      disabled={isLoadingSitePro}
                    >
                      {isLoadingSitePro ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Palette className="w-4 h-4" />
                      )}
                      {t.hosting?.websiteBuilder || "Website Builder"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-violet-500/10 hover:text-violet-500"
                    onClick={() => copyToClipboard(hosting.domain, "Domain")}
                  >
                    {copiedField === "Domain" ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Package */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Package</p>
                  <code className="text-sm font-mono text-foreground">{hosting.package}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-violet-500/10 hover:text-violet-500"
                  onClick={() => copyToClipboard(hosting.package, "Package")}
                >
                  {copiedField === "Package" ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Username */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <code className="text-sm font-mono text-foreground">{hosting.vpUsername}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-violet-500/10 hover:text-violet-500"
                  onClick={() => copyToClipboard(hosting.vpUsername, "Username")}
                >
                  {copiedField === "Username" ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{t.hosting.password}</p>
                  {hosting.password ? (
                    <code className="text-sm font-mono text-foreground">
                      {showPassword ? hosting.password : '••••••••••••'}
                    </code>
                  ) : (
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                      {t.hosting.passwordNotAvailable}
                    </span>
                  )}
                </div>
                {hosting.password && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-violet-500/10 hover:text-violet-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-violet-500/10 hover:text-violet-500"
                      onClick={() => copyToClipboard(hosting.password!, t.hosting.password)}
                    >
                      {copiedField === t.hosting.password ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* SQL Server - only show if sqlCluster exists */}
              {hosting.sqlCluster && (() => {
                // For custom domain: use first allowed domain
                // For subdomain: extract main domain from domain (e.g., abc.zarix.app -> zarix.app)
                const mainDomain = hosting.isCustomDomain 
                  ? firstAllowedDomain 
                  : (() => {
                      const parts = hosting.domain.split('.');
                      return parts.length > 2 ? parts.slice(-2).join('.') : hosting.domain;
                    })();
                const sqlServer = `${hosting.sqlCluster}.${mainDomain}`;
                
                return (
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm text-muted-foreground">SQL Server</p>
                      <code className="text-sm font-mono text-foreground">{sqlServer}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-violet-500/10 hover:text-violet-500"
                      onClick={() => copyToClipboard(sqlServer, "SQL Server")}
                    >
                      {copiedField === "SQL Server" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                );
              })()}

              {/* Created Date */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm text-muted-foreground">{t.hosting.createdDate}</p>
                  <code className="text-sm font-mono text-foreground">
                    {new Date(hosting.createdAt).toLocaleString('vi-VN')}
                  </code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-violet-500/10 hover:text-violet-500"
                  onClick={() => copyToClipboard(new Date(hosting.createdAt).toLocaleString('vi-VN'), t.hosting.createdDate)}
                >
                  {copiedField === t.hosting.createdDate ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Activated Date - only show if exists */}
              {hosting.activatedAt && (
                <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.hosting.activatedDate}</p>
                    <code className="text-sm font-mono text-foreground">
                      {new Date(hosting.activatedAt).toLocaleString('vi-VN')}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-violet-500/10 hover:text-violet-500"
                    onClick={() => copyToClipboard(new Date(hosting.activatedAt!).toLocaleString('vi-VN'), t.hosting.activatedDate)}
                  >
                    {copiedField === t.hosting.activatedDate ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Database Management */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-500" />
                {t.hosting.databaseManagement}
                {(dbQuota || databases.length > 0) && (
                  <span className="ml-auto text-sm font-normal px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    {dbQuota || databases.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Create Database Form */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t.hosting.createNewDatabase}</p>
                <div className="flex gap-2">
                  <div className="flex flex-1 items-center rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-violet-500">
                    <span className="pl-3 text-muted-foreground text-sm whitespace-nowrap">
                      {hosting.vpUsername}_
                    </span>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 7))}
                      placeholder="tendb"
                      disabled={hosting.status !== 'ACTIVE' || isCreatingDb}
                      className="flex-1 px-1 py-2 text-sm bg-transparent focus:outline-none disabled:opacity-50"
                      maxLength={7}
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!dbName.trim()) {
                        toast({ title: t.messages.error, description: t.hosting.enterDbName, variant: 'destructive' });
                        return;
                      }
                      setIsCreatingDb(true);
                      try {
                        const token = localStorage.getItem('accessToken');
                        const res = await fetch(`${API_URL}/api/vistapanel/${hosting.vpUsername}/databases`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ dbname: dbName }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to create database');
                        toast({ title: t.messages.success, description: t.hosting.dbCreated.replace('{name}', `${hosting.vpUsername}_${dbName}`) });
                        setDbName('');
                        // Refresh database list
                        fetchDatabases();
                      } catch (err: any) {
                        toast({ title: t.messages.error, description: err.message, variant: 'destructive' });
                      } finally {
                        setIsCreatingDb(false);
                      }
                    }}
                    disabled={hosting.status !== 'ACTIVE' || isCreatingDb || !dbName.trim()}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
                  >
                    {isCreatingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : t.hosting.create}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t.hosting.dbNameHelp}</p>
              </div>

              {/* Database List */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{t.hosting.databaseList}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchDatabases(true)}
                    disabled={hosting.status !== 'ACTIVE' || isLoadingDatabases}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingDatabases ? 'animate-spin' : ''}`} />
                    {t.hosting.sync}
                  </Button>
                </div>
                {isLoadingDatabases ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : databases.length > 0 ? (
                  <div className="space-y-2">
                    {databases.map((db) => (
                      <div key={db} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <code className="text-sm font-mono">{hosting.vpUsername}_{db}</code>
                        <div className="flex items-center gap-1">
                          {/* Copy button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(`${hosting.vpUsername}_${db}`, db)}
                            title={t.hosting.copyDbName}
                          >
                            {copiedField === db ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          {/* phpMyAdmin button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              setLoadingPmaDb(db);
                              try {
                                const token = localStorage.getItem('accessToken');
                                const res = await fetch(`${API_URL}/api/vistapanel/${hosting.vpUsername}/databases/${db}/phpmyadmin`, {
                                  headers: { 'Authorization': `Bearer ${token}` },
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed to get phpMyAdmin link');
                                if (data.link) {
                                  window.open(data.link, '_blank');
                                  toast({ title: t.hosting.phpMyAdminOpened, description: t.hosting.phpMyAdminOpenedDesc });
                                }
                              } catch (err: any) {
                                toast({ title: t.messages.error, description: err.message, variant: 'destructive' });
                              } finally {
                                setLoadingPmaDb(null);
                              }
                            }}
                            disabled={loadingPmaDb === db}
                            title={t.hosting.openPhpMyAdmin}
                            className="hover:bg-blue-500/10 hover:text-blue-500"
                          >
                            {loadingPmaDb === db ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ExternalLink className="w-4 h-4" />
                            )}
                          </Button>
                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!confirm(t.hosting.confirmDeleteDb.replace('{name}', `${hosting.vpUsername}_${db}`))) return;
                              setDeletingDb(db);
                              try {
                                const token = localStorage.getItem('accessToken');
                                const res = await fetch(`${API_URL}/api/vistapanel/${hosting.vpUsername}/databases/${db}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Failed to delete database');
                                toast({ title: t.messages.success, description: t.hosting.dbDeleted.replace('{name}', `${hosting.vpUsername}_${db}`) });
                                setDatabases(databases.filter(d => d !== db));
                              } catch (err: any) {
                                toast({ title: t.messages.error, description: err.message, variant: 'destructive' });
                              } finally {
                                setDeletingDb(null);
                              }
                            }}
                            disabled={deletingDb === db}
                            title={t.hosting.deleteDatabase}
                            className="hover:bg-red-500/10 hover:text-red-500"
                          >
                            {deletingDb === db ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {hosting.status !== 'ACTIVE' ? t.hosting.hostingNotActivated : t.hosting.noDatabasesYet}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HostingDetails;
