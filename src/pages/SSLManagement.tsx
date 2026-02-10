import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import authService from "@/services/auth";
import { 
  Shield, 
  Plus, 
  RefreshCw, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Server,
  AlertTriangle
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Hosting {
  id: string;
  username: string;
  domain: string;
  status: string;
  label?: string;
}

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
  hosting?: Hosting;
}

interface RequestError {
  error: string;
  message: string;
  maxHostings?: number;
  currentHostings?: number;
  slotsAvailable?: number;
  domain?: string;
  serviceDomain?: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDING_VERIFICATION: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
  VERIFYING: { color: 'bg-blue-500', icon: RefreshCw, label: 'Verifying' },
  VERIFIED: { color: 'bg-green-500', icon: CheckCircle, label: 'Verified' },
  ISSUING: { color: 'bg-blue-500', icon: RefreshCw, label: 'Issuing' },
  ISSUED: { color: 'bg-green-600', icon: CheckCircle, label: 'Active' },
  FAILED: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
  EXPIRED: { color: 'bg-gray-500', icon: AlertCircle, label: 'Expired' },
  REVOKED: { color: 'bg-red-600', icon: XCircle, label: 'Revoked' },
};

const providerOptions = [
  { value: 'LETS_ENCRYPT', label: "Let's Encrypt" },
  { value: 'GOOGLE_TRUST', label: 'Google Trust Services' },
];

export default function SSLManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const token = authService.getAccessToken();

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newProvider, setNewProvider] = useState('LETS_ENCRYPT');
  const [requestError, setRequestError] = useState<RequestError | null>(null);

  // Fetch all user's hosting accounts
  const { data: hostings = [] } = useQuery<Hosting[]>({
    queryKey: ['user-hostings'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/hosting`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch hostings');
      const data = await response.json();
      return data.hostings || [];
    },
  });

  // Fetch all SSL certificates for all hostings
  const { data: certificates = [], isLoading, refetch } = useQuery<SSLCertificate[]>({
    queryKey: ['user-ssl-certificates', hostings],
    queryFn: async () => {
      const allCertificates: SSLCertificate[] = [];
      for (const hosting of hostings) {
        try {
          const response = await fetch(`${API_URL}/api/ssl/hosting/${hosting.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const certs = await response.json();
            allCertificates.push(...certs.map((cert: SSLCertificate) => ({ ...cert, hosting })));
          }
        } catch (error) {
          console.error(`Failed to fetch certificates for hosting ${hosting.id}:`, error);
        }
      }
      return allCertificates;
    },
    enabled: hostings.length > 0,
    // Auto-refresh when there are certificates in pending/processing states
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.some(cert => 
        ['PENDING_VERIFICATION', 'VERIFYING', 'ISSUING', 'VERIFIED'].includes(cert.status)
      )) {
        return 5000; // Refresh every 5 seconds when processing
      }
      return false;
    },
  });

  // Request new certificate - only domain and provider required
  const requestMutation = useMutation({
    mutationFn: async ({ domain, provider }: { domain: string; provider: string }) => {
      const response = await fetch(`${API_URL}/api/ssl/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain, provider }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw data;
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: t.common?.success || 'Success',
        description: t.ssl?.requestSuccess || 'SSL certificate request created successfully',
      });
      setIsRequestDialogOpen(false);
      setNewDomain('');
      setRequestError(null);
      refetch();
      // Navigate to certificate detail page
      navigate(`/user/ssl/${data.certificate.id}`);
    },
    onError: (error: RequestError) => {
      setRequestError(error);
      
      // Show specific toast based on error type
      if (error.error === 'NO_SLOT_AVAILABLE') {
        toast({
          title: t.ssl?.noSlotTitle || 'No Available Slots',
          description: error.message,
          variant: 'destructive',
        });
      } else if (error.error === 'HOSTING_REQUIRED') {
        // Don't show toast, show inline message instead
      } else if (error.error === 'CPANEL_APPROVAL_REQUIRED') {
        // Don't show toast, show inline message instead
      } else if (error.error === 'HOSTING_NOT_ACTIVE') {
        toast({
          title: t.ssl?.hostingNotActive || 'Hosting Not Active',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.common?.error || 'Error',
          description: error.message || error.error,
          variant: 'destructive',
        });
      }
    },
  });

  const handleCreateRequest = () => {
    setRequestError(null);
    requestMutation.mutate({ domain: newDomain, provider: newProvider });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || { color: 'bg-gray-500', icon: AlertCircle, label: status };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t.ssl?.title || 'SSL Certificates'}
              </CardTitle>
              <Dialog open={isRequestDialogOpen} onOpenChange={(open) => {
                setIsRequestDialogOpen(open);
                if (!open) {
                  setRequestError(null);
                  setNewDomain('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.ssl?.requestNew || 'Create Certificate'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t.ssl?.requestNew || 'Request SSL Certificate'}</DialogTitle>
                    <DialogDescription>
                      {t.ssl?.requestDesc || 'Request a free SSL certificate for your domain'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain">{t.ssl?.domain || 'Domain'}</Label>
                      <Input
                        id="domain"
                        placeholder="example.com or sub.yourdomain.com"
                        value={newDomain}
                        onChange={(e) => {
                          setNewDomain(e.target.value);
                          setRequestError(null);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.ssl?.domainHint || 'Enter your domain or subdomain'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="provider">{t.ssl?.provider || 'Certificate Provider'}</Label>
                      <Select value={newProvider} onValueChange={setNewProvider}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {providerOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Error Messages */}
                    {requestError?.error === 'HOSTING_REQUIRED' && (
                      <Alert>
                        <Server className="h-4 w-4" />
                        <AlertTitle>{t.ssl?.hostingRequired || 'Hosting Account Required'}</AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>{t.ssl?.hostingRequiredDesc || 'This subdomain requires a hosting account.'}</p>
                          <p className="text-sm">
                            {t.ssl?.slotsAvailable || 'Available slots'}: <strong>{requestError.slotsAvailable}</strong>
                          </p>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setIsRequestDialogOpen(false);
                              navigate('/user/hosting/create');
                            }}
                          >
                            {t.ssl?.createHosting || 'Create Hosting Account'}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {requestError?.error === 'NO_SLOT_AVAILABLE' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{t.ssl?.noSlotTitle || 'No Available Slots'}</AlertTitle>
                        <AlertDescription>
                          <p>{t.ssl?.noSlotDesc || 'You have reached your hosting account limit.'}</p>
                          <p className="text-sm mt-1">
                            {t.ssl?.currentUsage || 'Current usage'}: <strong>{requestError.currentHostings}/{requestError.maxHostings}</strong>
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {requestError?.error === 'NO_ACTIVE_HOSTING' && (
                      <Alert>
                        <Server className="h-4 w-4" />
                        <AlertTitle>{t.ssl?.noActiveHosting || 'No Active Hosting'}</AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>{t.ssl?.noActiveHostingDesc || 'You need at least one active hosting account to request SSL for a custom domain.'}</p>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setIsRequestDialogOpen(false);
                              navigate('/user/hosting/create');
                            }}
                          >
                            {t.ssl?.createHosting || 'Create Hosting Account'}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    {requestError?.error === 'CPANEL_APPROVAL_REQUIRED' && (
                      <Alert className="border-amber-500/50 bg-amber-500/10">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <AlertTitle className="text-amber-600 dark:text-amber-400">
                          {t.ssl?.cpanelApprovalRequired || 'cPanel Approval Required'}
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>{t.ssl?.cpanelApprovalDesc || 'You must login to cPanel at least once before requesting SSL certificates.'}</p>
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
                            onClick={() => {
                              setIsRequestDialogOpen(false);
                              navigate(`/user/hosting/${requestError.hostingUsername}/cpanel`);
                            }}
                          >
                            {t.ssl?.loginToCpanel || 'Login to cPanel'}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                      {t.common?.cancel || 'Cancel'}
                    </Button>
                    <Button 
                      onClick={handleCreateRequest}
                      disabled={!newDomain || requestMutation.isPending}
                    >
                      {requestMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                      {t.ssl?.create || 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : certificates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t.ssl?.noCertificates || 'No SSL Certificates'}</h3>
                <p className="text-muted-foreground text-center">
                  {t.ssl?.noCertificatesDesc || "You haven't requested any SSL certificates yet. Click the button above to request one."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.ssl?.domain || 'Domain'}</TableHead>
                      <TableHead>{t.ssl?.type || 'Type'}</TableHead>
                      <TableHead>{t.ssl?.status || 'Status'}</TableHead>
                      <TableHead>{t.ssl?.validUntil || 'Valid Until'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert) => (
                      <TableRow 
                        key={cert.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/user/ssl/${cert.id}`)}
                      >
                        <TableCell className="font-medium">{cert.domain}</TableCell>
                        <TableCell>
                          <Badge variant={cert.domainType === 'SUBDOMAIN' ? 'secondary' : 'outline'}>
                            {cert.domainType === 'SUBDOMAIN' ? t.ssl?.subdomain || 'Subdomain' : t.ssl?.customDomain || 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={cert.status} />
                        </TableCell>
                        <TableCell>
                          {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>{t.ssl?.howItWorks || 'How it works'}</AlertTitle>
          <AlertDescription>
            {t.ssl?.howItWorksDesc || 'Request a certificate, add the DNS record shown, click verify. Once verified, your certificate will be issued automatically.'}
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
