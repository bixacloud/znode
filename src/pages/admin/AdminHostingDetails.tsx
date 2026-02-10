import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Folder,
  Globe,
  User,
  Mail,
  Calendar,
  Shield,
  Power,
  PowerOff,
  Activity,
  HardDrive,
  Package,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { formatSuspendReason, isSuspendedByAdmin as checkSuspendedByAdmin } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Hosting {
  id: string;
  vpUsername: string;
  username: string;
  password: string;
  domain: string;
  package: string;
  label: string | null;
  status: string;
  sqlCluster: string | null;
  suspendReason: string | null;
  createdAt: string;
  activatedAt: string | null;
  suspendedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

const AdminHostingDetails = () => {
  const { vpUsername } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  usePageTitle(t.admin?.hostingDetails || 'Hosting Details');
  const { toast } = useToast();
  
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoadingFileManager, setIsLoadingFileManager] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isUnsuspending, setIsUnsuspending] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  // Fetch hosting details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-hosting-details", vpUsername],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/admin/hostings/${vpUsername}`, {
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          label: t.hosting.active,
          icon: CheckCircle,
          className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          dotColor: "bg-emerald-500",
          glowColor: "shadow-emerald-500/25",
        };
      case "PENDING":
        return {
          label: t.hosting.pending,
          icon: Clock,
          className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          dotColor: "bg-amber-500",
          glowColor: "shadow-amber-500/25",
        };
      case "SUSPENDING":
        return {
          label: t.hosting.suspending,
          icon: Loader2,
          className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
          dotColor: "bg-orange-500 animate-pulse",
          glowColor: "shadow-orange-500/25",
          spinning: true,
        };
      case "REACTIVATING":
        return {
          label: t.hosting.reactivating,
          icon: Loader2,
          className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          dotColor: "bg-blue-500 animate-pulse",
          glowColor: "shadow-blue-500/25",
          spinning: true,
        };
      case "SUSPENDED":
        return {
          label: t.hosting.suspended,
          icon: AlertCircle,
          className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
          dotColor: "bg-red-500",
          glowColor: "shadow-red-500/25",
        };
      case "DELETED":
        return {
          label: t.hosting.deleted,
          icon: XCircle,
          className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
          dotColor: "bg-gray-500",
          glowColor: "shadow-gray-500/25",
        };
      default:
        return {
          label: status,
          icon: Clock,
          className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
          dotColor: "bg-gray-500",
          glowColor: "shadow-gray-500/25",
        };
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: t.admin?.copied || "Copied!",
        description: `${field} ${t.admin?.copiedToClipboard || "copied to clipboard"}`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    copyable, 
    copyKey,
    isLink,
    href 
  }: { 
    icon: any; 
    label: string; 
    value: string; 
    copyable?: boolean;
    copyKey?: string;
    isLink?: boolean;
    href?: string;
  }) => (
    <div className="group flex items-center justify-between py-4 px-1 hover:bg-muted/30 rounded-lg transition-colors -mx-1">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {isLink && href ? (
          <a 
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-1.5"
          >
            {value}
            <ExternalLink className="w-3.5 h-3.5 opacity-50" />
          </a>
        ) : (
          <span className="font-medium text-sm">{value}</span>
        )}
        {copyable && copyKey && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(value, copyKey)}
                >
                  {copiedField === copyKey ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t.admin?.copyToClipboard || "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  const handleOpenFileManager = async () => {
    if (!hosting) return;
    
    setIsLoadingFileManager(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/admin/hostings/${hosting.vpUsername}/filemanager`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (result.link) {
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

  const handleSuspend = async () => {
    if (!hosting) return;
    
    setIsSuspending(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/admin/hostings/${hosting.vpUsername}/suspend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: suspendReason }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: t.admin.suspendStarted,
          description: t.admin.suspendStartedDesc,
        });
        setShowSuspendDialog(false);
        setSuspendReason("");
        refetch();
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.admin.suspendFailed,
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
      setIsSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!hosting) return;
    
    if (!confirm(t.admin.confirmUnsuspend)) {
      return;
    }
    
    setIsUnsuspending(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/admin/hostings/${hosting.vpUsername}/unsuspend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: t.admin.unsuspendStarted,
          description: t.admin.unsuspendStartedDesc,
        });
        refetch();
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.admin.unsuspendFailed,
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
      setIsUnsuspending(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
            </div>
            <p className="text-sm text-muted-foreground">{t.admin?.loadingHostingDetails || "Loading hosting details..."}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!hosting) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Server className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t.hosting.notFound}</h2>
            <p className="text-muted-foreground mb-6">{t.hosting.notFoundDesc}</p>
            <Button asChild>
              <Link to="/admin/hostings" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t.admin.backToHostings}
              </Link>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statusConfig = getStatusConfig(hosting.status);
  const StatusIcon = statusConfig.icon;
  const isSuspendedByAdminFlag = checkSuspendedByAdmin(hosting.suspendReason);

  return (
    <AdminLayout>
      <TooltipProvider>
        <div className="space-y-8 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/admin/hostings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Hostings
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {hosting.domain}
            </span>
          </nav>

          {/* Header Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/20 border border-border shadow-sm">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                {/* Left: Server info */}
                <div className="flex items-start gap-5">
                  <div className="relative">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg ${statusConfig.glowColor}`}>
                      <Server className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                    </div>
                    {/* Status indicator dot */}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-card ${statusConfig.dotColor}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
                        {hosting.label || hosting.domain}
                      </h1>
                      <Badge 
                        variant="outline" 
                        className={`${statusConfig.className} border font-medium px-2.5 py-0.5`}
                      >
                        <StatusIcon className={`w-3.5 h-3.5 mr-1.5 ${statusConfig.spinning ? 'animate-spin' : ''}`} />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <a 
                        href={`https://${hosting.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        {hosting.domain}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                      <span className="flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        {hosting.package}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {hosting.user.name || hosting.user.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {hosting.status === 'ACTIVE' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleOpenFileManager}
                        disabled={isLoadingFileManager}
                      >
                        {isLoadingFileManager ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Folder className="w-4 h-4" />
                        )}
                        {t.admin?.fileManager || "File Manager"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowSuspendDialog(true)}
                      >
                        <PowerOff className="w-4 h-4" />
                        {t.admin?.suspend || "Suspend"}
                      </Button>
                    </>
                  )}
                  
                  {hosting.status === 'SUSPENDED' && (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleUnsuspend}
                      disabled={isUnsuspending}
                    >
                      {isUnsuspending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                      {t.admin?.unsuspend || "Unsuspend"}
                    </Button>
                  )}
                  
                  {(hosting.status === 'SUSPENDING' || hosting.status === 'REACTIVATING') && (
                    <Badge variant="outline" className="bg-muted/50">
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      {t.admin?.processing || "Processing..."}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Suspend reason alert */}
          {hosting.status === 'SUSPENDED' && hosting.suspendReason && (
            <div className="relative overflow-hidden rounded-xl bg-red-500/5 border border-red-500/20 p-5">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
              <div className="flex items-start gap-4 pl-2">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-600 dark:text-red-400">
                    {t.admin?.accountSuspended || "Account Suspended"}
                  </h3>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                    {formatSuspendReason(hosting.suspendReason, t.admin?.adminSuspended || "Admin suspended")}
                  </p>
                  {isSuspendedByAdminFlag && (
                    <Badge variant="outline" className="mt-3 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                      <Shield className="w-3 h-3 mr-1" />
                      {t.admin?.suspendedByAdmin || "Suspended by Administrator"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info - Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hosting Details Card */}
              <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <HardDrive className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="font-semibold">{t.admin?.hostingDetails || "Hosting Details"}</h2>
                  </div>
                </div>
                <div className="p-6 divide-y divide-border/50">
                  <InfoRow 
                    icon={Globe} 
                    label={t.hosting?.domain || "Domain"} 
                    value={hosting.domain} 
                    copyable 
                    copyKey="domain"
                    isLink
                    href={`https://${hosting.domain}`}
                  />
                  <InfoRow 
                    icon={User} 
                    label={t.hosting?.username || "Username"} 
                    value={hosting.vpUsername} 
                    copyable 
                    copyKey="username"
                  />
                  <InfoRow 
                    icon={Package} 
                    label="Package" 
                    value={hosting.package}
                  />
                  <InfoRow 
                    icon={Calendar} 
                    label={t.hosting?.createdAt || "Created"} 
                    value={new Date(hosting.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  />
                  {hosting.activatedAt && (
                    <InfoRow 
                      icon={CheckCircle} 
                      label={t.hosting?.activatedAt || "Activated"} 
                      value={new Date(hosting.activatedAt).toLocaleDateString()}
                    />
                  )}
                  {hosting.suspendedAt && (
                    <InfoRow 
                      icon={AlertCircle} 
                      label={t.hosting?.suspended || "Suspended"} 
                      value={new Date(hosting.suspendedAt).toLocaleDateString()}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Right column */}
            <div className="space-y-6">
              {/* Owner Card */}
              <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-500" />
                    </div>
                    <h2 className="font-semibold">{t.admin?.accountOwner || "Account Owner"}</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {(hosting.user.name || hosting.user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {hosting.user.name || (t.admin?.noName || 'No name')}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {hosting.user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigate(`/admin/email/send?to=${encodeURIComponent(hosting.user.email)}`)}
                  >
                    <Mail className="w-4 h-4" />
                    {t.admin?.sendEmail || "Send Email"}
                  </Button>
                </div>
              </div>

              {/* Activity Card */}
              <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h2 className="font-semibold">{t.admin?.statusTimeline || "Status Timeline"}</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                      <div>
                        <p className="text-sm font-medium">{t.admin?.accountCreated || "Account Created"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(hosting.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {hosting.activatedAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                        <div>
                          <p className="text-sm font-medium">{t.admin?.accountActivated || "Account Activated"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(hosting.activatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {hosting.suspendedAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                        <div>
                          <p className="text-sm font-medium">{t.admin?.accountSuspended || "Account Suspended"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(hosting.suspendedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <PowerOff className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <DialogTitle>{t.admin.suspendAccount}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {hosting.domain}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.admin.suspendReasonLabel}</Label>
              <Textarea
                placeholder={t.admin.suspendReasonPlaceholder}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ {t.admin.suspendNote}
              </p>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSuspend}
              disabled={isSuspending}
              className="gap-2"
            >
              {isSuspending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.admin.confirmSuspend}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminHostingDetails;
