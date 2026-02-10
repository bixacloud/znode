import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Calendar
} from "lucide-react";

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
  createdAt: string;
  hostingId: string;
  hosting?: {
    id: string;
    username: string;
    domain: string;
  };
}

const statusConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  PENDING_VERIFICATION: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Clock, label: 'Pending' },
  VERIFYING: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: RefreshCw, label: 'Verifying' },
  VERIFIED: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'Verified' },
  ISSUING: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: RefreshCw, label: 'Issuing' },
  ISSUED: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'Active' },
  FAILED: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Failed' },
  EXPIRED: { color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30', icon: AlertCircle, label: 'Expired' },
  REVOKED: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Revoked' },
};

const providerLabels: Record<string, string> = {
  LETS_ENCRYPT: "Let's Encrypt",
  GOOGLE_TRUST: "Google Trust Services",
};

export default function SSLCertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const token = authService.getAccessToken();

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch certificate details
  const { data: certificate, isLoading, refetch } = useQuery<SSLCertificate>({
    queryKey: ['ssl-certificate', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/certificate/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch certificate');
      return response.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && ['VERIFYING', 'ISSUING', 'PENDING_VERIFICATION', 'VERIFIED'].includes(data.status)) {
        return 3000; // Refresh every 3 seconds when processing
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

  // Verify certificate
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/verify/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Verification failed');
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: t.common?.success || 'Success',
        description: t.ssl?.verifySuccess || 'DNS verified successfully',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: t.ssl?.verifyFailed || 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Issue certificate
  const issueMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/issue/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Issue failed');
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

  // Delete certificate
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/ssl/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete certificate');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.common?.success || 'Success',
        description: t.ssl?.deleteSuccess || 'Certificate deleted successfully',
      });
      navigate('/user/ssl');
    },
    onError: () => {
      toast({
        title: t.common?.error || 'Error',
        description: t.ssl?.deleteFailed || 'Failed to delete certificate',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadCertificate = () => {
    if (!certificate) return;
    
    const files = [
      { name: `${certificate.domain}.crt`, content: certificate.certificate },
      { name: `${certificate.domain}.ca-bundle`, content: certificate.caCertificate },
    ];

    files.forEach(file => {
      if (file.content) {
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: AlertCircle, label: status };
    const Icon = config.icon;
    const isAnimated = ['VERIFYING', 'ISSUING'].includes(status);
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
        <Icon className={`w-3.5 h-3.5 ${isAnimated ? 'animate-spin' : ''}`} />
        {config.label}
      </div>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!certificate) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Shield className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t.ssl?.notFound || 'Certificate Not Found'}</h3>
          <Button onClick={() => navigate('/user/ssl')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common?.back || 'Back'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isProcessing = ['PENDING_VERIFICATION', 'VERIFYING', 'ISSUING'].includes(certificate.status);
  const isSubdomain = certificate.domainType === 'SUBDOMAIN';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/user/ssl')} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.common?.back || 'Back'}
        </Button>

        {/* Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${statusConfig[certificate.status]?.bgColor || 'bg-gray-100'}`}>
                  <Globe className={`w-6 h-6 ${statusConfig[certificate.status]?.color || 'text-gray-600'}`} />
                </div>
                <div className="space-y-1 min-w-0">
                  <h1 className="text-xl font-bold break-all">{certificate.domain}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{providerLabels[certificate.provider]}</span>
                    <span>•</span>
                    <span>{isSubdomain ? t.ssl?.subdomain || 'Subdomain' : t.ssl?.customDomain || 'Custom Domain'}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <StatusBadge status={certificate.status} />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {t.ssl?.createdAt || 'Created'}
                </div>
                <p className="font-medium text-sm">{new Date(certificate.createdAt).toLocaleDateString()}</p>
              </div>
              
              {certificate.verifiedAt && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t.ssl?.verifiedAt || 'Verified'}
                  </div>
                  <p className="font-medium text-sm">{new Date(certificate.verifiedAt).toLocaleDateString()}</p>
                </div>
              )}
              
              {certificate.issuedAt && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5" />
                    {t.ssl?.issuedAt || 'Issued'}
                  </div>
                  <p className="font-medium text-sm">{new Date(certificate.issuedAt).toLocaleDateString()}</p>
                </div>
              )}
              
              {certificate.expiresAt && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {t.ssl?.expiresAt || 'Expires'}
                  </div>
                  <p className="font-medium text-sm">{new Date(certificate.expiresAt).toLocaleDateString()}</p>
                </div>
              )}

              {certificate.hosting && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Server className="w-3.5 h-3.5" />
                    {t.ssl?.hostingAccount || 'Hosting'}
                  </div>
                  <p className="font-medium text-sm">{certificate.hosting.domain}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {certificate.lastError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{t.ssl?.lastError || 'Error'}</AlertTitle>
            <AlertDescription className="mt-1">{certificate.lastError}</AlertDescription>
          </Alert>
        )}

        {/* Processing Status for Subdomain */}
        {isProcessing && isSubdomain && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                {t.ssl?.processingTitle || 'Issuing SSL Certificate'}
              </CardTitle>
              <CardDescription>
                {t.ssl?.processingDesc || 'Your SSL certificate is being issued automatically. This may take 1-2 minutes.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Steps */}
              <div className="space-y-3">
                {[
                  { key: 'PENDING_VERIFICATION', label: t.ssl?.step1 || '1. Creating DNS records' },
                  { key: 'VERIFYING', label: t.ssl?.step2 || '2. Verifying domain ownership' },
                  { key: 'ISSUING', label: t.ssl?.step3 || '3. Issuing certificate' },
                ].map((step, index) => {
                  const steps = ['PENDING_VERIFICATION', 'VERIFYING', 'ISSUING'];
                  const currentIndex = steps.indexOf(certificate.status);
                  const stepIndex = index;
                  
                  let icon;
                  let className = 'text-muted-foreground';
                  
                  if (stepIndex < currentIndex) {
                    icon = <CheckCircle className="w-5 h-5 text-green-500" />;
                  } else if (stepIndex === currentIndex) {
                    icon = <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
                    className = 'font-medium text-foreground';
                  } else {
                    icon = <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
                  }
                  
                  return (
                    <div key={step.key} className={`flex items-center gap-3 ${className}`}>
                      {icon}
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Logs */}
              {certificate.status === 'ISSUING' && logs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">{t.ssl?.logs || 'Progress'}</Label>
                  <div className="bg-muted p-3 rounded-lg font-mono text-xs max-h-32 overflow-y-auto">
                    {logs.map((log, i) => (
                      <p key={i} className={log.includes('ERROR') ? 'text-red-500' : 'text-muted-foreground'}>{log}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.common?.cancel || 'Cancel'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending Verification for Custom Domain */}
        {certificate.status === 'PENDING_VERIFICATION' && !isSubdomain && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                {t.ssl?.addDnsRecord || 'Add DNS Record'}
              </CardTitle>
              <CardDescription>
                {t.ssl?.addTxtRecord || 'Add the following TXT record to your DNS provider:'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.ssl?.recordType || 'Type'}</Label>
                    <div className="font-mono text-sm font-medium">TXT</div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.ssl?.recordName || 'Name'}</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-background px-2 py-1 rounded truncate">
                        _acme-challenge.{certificate.domain}
                      </code>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => copyToClipboard(`_acme-challenge.${certificate.domain}`, 'name')}
                      >
                        {copiedField === 'name' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.ssl?.value || 'Value'}</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-background px-2 py-1 rounded break-all">
                      {certificate.txtRecord}
                    </code>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyToClipboard(certificate.txtRecord || '', 'value')}
                    >
                      {copiedField === 'value' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {t.ssl?.verify || 'Verify DNS'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.common?.delete || 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verifying for Custom Domain */}
        {certificate.status === 'VERIFYING' && !isSubdomain && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                {t.ssl?.verifyingDns || 'Verifying DNS'}
              </CardTitle>
              <CardDescription>
                {t.ssl?.verifyingDnsDesc || 'DNS verification in progress. Please wait...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <Label className="text-xs">{t.ssl?.expectedRecord || 'Expected Record'}</Label>
                <p className="font-mono text-sm mt-1">
                  _acme-challenge.{certificate.domain} → {certificate.txtRecord}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {t.ssl?.retryVerification || 'Retry'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.common?.cancel || 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verified - Ready to Issue (Custom Domain) */}
        {certificate.status === 'VERIFIED' && !isSubdomain && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {t.ssl?.dnsVerified || 'DNS Verified'}
              </CardTitle>
              <CardDescription>
                {t.ssl?.readyToIssue || 'Your domain has been verified. You can now issue the SSL certificate.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending}
                >
                  {issueMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  <Shield className="w-4 h-4 mr-2" />
                  {t.ssl?.issueCertificate || 'Issue Certificate'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.common?.cancel || 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Issuing for Custom Domain */}
        {certificate.status === 'ISSUING' && !isSubdomain && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                {t.ssl?.issuingTitle || 'Issuing Certificate'}
              </CardTitle>
              <CardDescription>
                {t.ssl?.issuingDesc || 'Your certificate is being issued. This usually takes a few minutes.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{t.ssl?.logs || 'Progress'}</Label>
                <div className="bg-muted p-3 rounded-lg font-mono text-xs max-h-48 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground">{t.ssl?.waitingLogs || 'Waiting for logs...'}</p>
                  ) : (
                    logs.map((log, i) => (
                      <p key={i} className={log.includes('ERROR') ? 'text-red-500' : ''}>{log}</p>
                    ))
                  )}
                </div>
              </div>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.ssl?.refreshStatus || 'Refresh'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Issued - Certificate Details */}
        {certificate.status === 'ISSUED' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{t.ssl?.certificateDetails || 'Certificate Files'}</CardTitle>
                  <CardDescription>
                    {t.ssl?.autoInstalledDesc || 'Certificate has been automatically installed on your hosting.'}
                  </CardDescription>
                </div>
                <Button onClick={downloadCertificate} size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  {t.ssl?.downloadAll || 'Download'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="certificate" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="certificate">{t.ssl?.certificate || 'Certificate'}</TabsTrigger>
                  <TabsTrigger value="caBundle">{t.ssl?.caBundle || 'CA Bundle'}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="certificate">
                  <div className="relative">
                    <Textarea 
                      readOnly 
                      value={certificate.certificate || ''}
                      className="font-mono text-xs h-48 resize-none"
                    />
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(certificate.certificate || '', 'cert')}
                    >
                      {copiedField === 'cert' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="caBundle">
                  <div className="relative">
                    <Textarea 
                      readOnly 
                      value={certificate.caCertificate || ''}
                      className="font-mono text-xs h-48 resize-none"
                    />
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(certificate.caCertificate || '', 'ca')}
                    >
                      {copiedField === 'ca' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {certificate.status === 'ISSUED' && (
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.ssl?.revoke || 'Revoke Certificate'}
            </Button>
          </div>
        )}

        {/* Failed Status - Retry Option */}
        {certificate.status === 'FAILED' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => navigate('/user/ssl')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.ssl?.backToList || 'Back to List'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.common?.delete || 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
