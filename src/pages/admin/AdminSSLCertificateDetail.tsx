import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import authService from "@/services/auth";
import { 
  Shield, 
  ArrowLeft,
  RefreshCw, 
  Copy, 
  Check, 
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Globe,
  Server,
  Calendar,
  User,
  ExternalLink,
  Play,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface SSLCertificate {
  id: string;
  domain: string;
  domainType: 'SUBDOMAIN' | 'CUSTOM';
  provider: 'LETS_ENCRYPT' | 'GOOGLE_TRUST';
  status: string;
  txtRecord?: string;
  cnameRecord?: string;
  verifiedAt: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  lastError: string | null;
  certificate?: string;
  privateKey?: string;
  caCertificate?: string;
  hasPrivateKey?: boolean;
  createdAt: string;
  hostingId: string;
  hosting?: {
    id: string;
    vpUsername: string;
    domain: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  PENDING_VERIFICATION: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Clock, label: 'Pending' },
  VERIFYING: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: RefreshCw, label: 'Verifying' },
  VERIFIED: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'Verified' },
  ISSUING: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: RefreshCw, label: 'Issuing' },
  ISSUED: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'Active' },
  FAILED: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Failed' },
  EXPIRED: { color: 'text-muted-foreground', bgColor: 'bg-muted', icon: AlertCircle, label: 'Expired' },
  REVOKED: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Revoked' },
};

const providerLabels: Record<string, string> = {
  LETS_ENCRYPT: "Let's Encrypt",
  GOOGLE_TRUST: "Google Trust Services",
};

export default function AdminSSLCertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.sslCertificateDetail || 'SSL Certificate Detail');
  const token = authService.getAccessToken();

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch certificate details (admin endpoint)
  const { data: certificate, isLoading, refetch } = useQuery<SSLCertificate>({
    queryKey: ['admin-ssl-certificate', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/admin/certificate/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch certificate');
      return response.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && ['VERIFYING', 'ISSUING', 'PENDING_VERIFICATION', 'VERIFIED'].includes(data.status)) {
        return 3000;
      }
      return false;
    },
  });

  // Fetch logs for ISSUING status
  const { data: logsData } = useQuery<{ logs: string[]; status: string }>({
    queryKey: ['ssl-logs', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/logs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return { logs: [], status: '' };
      return response.json();
    },
    enabled: certificate?.status === 'ISSUING',
    refetchInterval: certificate?.status === 'ISSUING' ? 2000 : false,
  });
  
  const logs = logsData?.logs || [];

  // Issue certificate mutation (admin)
  const issueMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/admin/issue/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Issue failed');
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: t.common?.success || 'Success',
        description: t.ssl?.issueStarted || 'Certificate issuance started',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: t.ssl?.issueFailed || 'Issue Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Retry failed certificate (admin)
  const retryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/admin/retry/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Retry failed');
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: t.common?.success || 'Success',
        description: t.ssl?.retryStarted || 'Certificate retry started',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: t.common?.copied || 'Copied',
      description: t.ssl?.copiedToClipboard || 'Copied to clipboard',
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!certificate) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t.ssl?.certificateNotFound || 'Certificate not found'}</p>
          <Button onClick={() => navigate('/admin/ssl-certificates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common?.back || 'Back'}
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const statusInfo = statusConfig[certificate.status] || statusConfig.PENDING_VERIFICATION;
  const StatusIcon = statusInfo.icon;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/ssl-certificates')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">{certificate.domain}</h1>
                <p className="text-sm text-muted-foreground">
                  {providerLabels[certificate.provider]}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t.common?.refresh || 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Status and Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.ssl?.status || 'Status'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("flex items-center gap-2 p-2 rounded-md", statusInfo.bgColor)}>
                <StatusIcon className={cn("w-5 h-5", statusInfo.color, certificate.status === 'ISSUING' && 'animate-spin')} />
                <span className={cn("font-medium", statusInfo.color)}>{statusInfo.label}</span>
              </div>
            </CardContent>
          </Card>

          {/* User Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.ssl?.user || 'User'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{certificate.hosting?.user?.name || certificate.hosting?.user?.email}</p>
                  {certificate.hosting?.user?.name && (
                    <p className="text-xs text-muted-foreground">{certificate.hosting?.user?.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hosting Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.ssl?.hosting || 'Hosting'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{certificate.hosting?.domain}</p>
                  <p className="text-xs text-muted-foreground">{certificate.hosting?.vpUsername}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {certificate.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t.ssl?.error || 'Error'}</AlertTitle>
            <AlertDescription>{certificate.lastError}</AlertDescription>
          </Alert>
        )}

        {/* Admin Actions */}
        {(certificate.status === 'VERIFIED' || certificate.status === 'FAILED') && (
          <Card>
            <CardHeader>
              <CardTitle>{t.admin?.actions || 'Admin Actions'}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              {certificate.status === 'VERIFIED' && (
                <Button onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending}>
                  {issueMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {t.ssl?.issueCertificate || 'Issue Certificate'}
                </Button>
              )}
              {certificate.status === 'FAILED' && (
                <Button variant="outline" onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
                  {retryMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  {t.ssl?.retry || 'Retry'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Issuing Logs */}
        {certificate.status === 'ISSUING' && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t.ssl?.issuingLogs || 'Issuing Logs'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/90 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-gray-500">[{index + 1}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* DNS Verification Info */}
        {(certificate.status === 'PENDING_VERIFICATION' || certificate.status === 'VERIFYING') && (
          <Card>
            <CardHeader>
              <CardTitle>{t.ssl?.dnsVerification || 'DNS Verification'}</CardTitle>
              <CardDescription>
                {certificate.domainType === 'SUBDOMAIN' 
                  ? (t.ssl?.dnsVerificationDescSubdomain || 'Add the following CNAME record to your DNS')
                  : (t.ssl?.dnsVerificationDescCustom || 'Add the following TXT record to your DNS')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {certificate.domainType === 'SUBDOMAIN' && certificate.cnameRecord && (
                <div className="space-y-2">
                  <Label>{t.ssl?.cnameRecord || 'CNAME Record'}</Label>
                  <div className="flex gap-2">
                    <Textarea
                      readOnly
                      value={certificate.cnameRecord}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(certificate.cnameRecord!, 'cname')}
                    >
                      {copiedField === 'cname' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {certificate.domainType === 'CUSTOM' && certificate.txtRecord && (
                <div className="space-y-2">
                  <Label>{t.ssl?.txtRecord || 'TXT Record'}</Label>
                  <div className="flex gap-2">
                    <Textarea
                      readOnly
                      value={certificate.txtRecord}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(certificate.txtRecord!, 'txt')}
                    >
                      {copiedField === 'txt' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Certificate Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t.ssl?.certificateDetails || 'Certificate Details'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">{t.ssl?.domainType || 'Domain Type'}</Label>
                <p className="font-medium">
                  <Badge variant={certificate.domainType === 'SUBDOMAIN' ? 'secondary' : 'outline'}>
                    {certificate.domainType === 'SUBDOMAIN' ? t.ssl?.subdomain || 'Subdomain' : t.ssl?.custom || 'Custom'}
                  </Badge>
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">{t.ssl?.provider || 'Provider'}</Label>
                <p className="font-medium">{providerLabels[certificate.provider]}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">{t.ssl?.createdAt || 'Created At'}</Label>
                <p className="font-medium">{formatDate(certificate.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">{t.ssl?.verifiedAt || 'Verified At'}</Label>
                <p className="font-medium">{formatDate(certificate.verifiedAt)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">{t.ssl?.issuedAt || 'Issued At'}</Label>
                <p className="font-medium">{formatDate(certificate.issuedAt)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">{t.ssl?.expiresAt || 'Expires At'}</Label>
                <p className="font-medium">{formatDate(certificate.expiresAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Content (if issued) */}
        {certificate.status === 'ISSUED' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.ssl?.certificateContent || 'Certificate Content'}</CardTitle>
              <CardDescription>
                {t.ssl?.certificateContentDesc || 'Use these values to install the SSL certificate on your server'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="certificate">
                <TabsList>
                  <TabsTrigger value="certificate">{t.ssl?.certificate || 'Certificate'}</TabsTrigger>
                  <TabsTrigger value="ca">{t.ssl?.caCertificate || 'CA Certificate'}</TabsTrigger>
                  <TabsTrigger value="privateKey">{t.ssl?.privateKey || 'Private Key'}</TabsTrigger>
                </TabsList>
                <TabsContent value="certificate" className="space-y-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => certificate.certificate && copyToClipboard(certificate.certificate, 'cert')}
                      disabled={!certificate.certificate}
                    >
                      {copiedField === 'cert' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {t.common?.copy || 'Copy'}
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    value={certificate.certificate || ''}
                    className="font-mono text-xs h-48"
                  />
                </TabsContent>
                <TabsContent value="ca" className="space-y-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => certificate.caCertificate && copyToClipboard(certificate.caCertificate, 'ca')}
                      disabled={!certificate.caCertificate}
                    >
                      {copiedField === 'ca' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {t.common?.copy || 'Copy'}
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    value={certificate.caCertificate || ''}
                    className="font-mono text-xs h-48"
                  />
                </TabsContent>
                <TabsContent value="privateKey" className="space-y-2">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t.ssl?.privateKeyHidden || 'Private Key Hidden'}</AlertTitle>
                    <AlertDescription>
                      {t.ssl?.privateKeyHiddenDesc || 'Private keys are hidden in the admin view for security. The user can view their private key from their dashboard.'}
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
