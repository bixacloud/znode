import { useState, useEffect } from "react";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Shield
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface SSLCertificate {
  id: string;
  domain: string;
  domainType: 'SUBDOMAIN' | 'CUSTOM';
  provider: 'LETS_ENCRYPT' | 'GOOGLE_TRUST';
  status: string;
  verifiedAt: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  lastError: string | null;
  createdAt: string;
  hosting: {
    id: string;
    domain: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDING_VERIFICATION: { color: 'bg-yellow-500', icon: Clock, label: 'Pending Verification' },
  VERIFYING: { color: 'bg-blue-500', icon: RefreshCw, label: 'Verifying' },
  VERIFIED: { color: 'bg-green-500', icon: CheckCircle, label: 'Verified' },
  ISSUING: { color: 'bg-blue-500', icon: RefreshCw, label: 'Issuing' },
  ISSUED: { color: 'bg-green-600', icon: CheckCircle, label: 'Issued' },
  FAILED: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
  EXPIRED: { color: 'bg-gray-500', icon: AlertCircle, label: 'Expired' },
  REVOKED: { color: 'bg-red-600', icon: XCircle, label: 'Revoked' },
};

const providerLabels: Record<string, string> = {
  LETS_ENCRYPT: "Let's Encrypt",
  GOOGLE_TRUST: "Google Trust",
};

export default function AdminSSLCertificates() {
  const { t } = useLanguage();
  usePageTitle(t.admin?.sslCertificates || 'SSL Certificates');
  const token = authService.getAccessToken();

  // Certificates state
  const [certificates, setCertificates] = useState<SSLCertificate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCerts, setLoadingCerts] = useState(true);

  // Fetch certificates
  const fetchCertificates = async (page = 1) => {
    try {
      setLoadingCerts(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`${API_URL}/api/ssl/admin/certificates?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCertificates(data.certificates);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoadingCerts(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  useEffect(() => {
    fetchCertificates(1);
  }, [statusFilter, searchQuery]);

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
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t.admin?.sslCertificates || 'SSL Certificates'}</h1>
            <p className="text-muted-foreground">
              {t.admin?.sslCertificatesDesc || 'View and manage all user SSL certificate requests'}
            </p>
          </div>
        </div>

        {/* Certificates Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t.ssl?.allCertificates || 'All Certificates'}</CardTitle>
            <CardDescription>
              {t.ssl?.allCertificatesDesc || 'View and manage all SSL certificate requests'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.ssl?.searchPlaceholder || 'Search by domain or email...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.ssl?.filterByStatus || 'Filter by status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common?.all || 'All'}</SelectItem>
                  <SelectItem value="PENDING_VERIFICATION">{t.ssl?.statusPending || 'Pending'}</SelectItem>
                  <SelectItem value="VERIFIED">{t.ssl?.statusVerified || 'Verified'}</SelectItem>
                  <SelectItem value="ISSUING">{t.ssl?.statusIssuing || 'Issuing'}</SelectItem>
                  <SelectItem value="ISSUED">{t.ssl?.statusIssued || 'Issued'}</SelectItem>
                  <SelectItem value="FAILED">{t.ssl?.statusFailed || 'Failed'}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => fetchCertificates(pagination.page)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.common?.refresh || 'Refresh'}
              </Button>
            </div>

            {/* Table */}
            {loadingCerts ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t.ssl?.noCertificates || 'No certificates found'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.ssl?.domain || 'Domain'}</TableHead>
                    <TableHead>{t.ssl?.type || 'Type'}</TableHead>
                    <TableHead>{t.ssl?.provider || 'Provider'}</TableHead>
                    <TableHead>{t.ssl?.status || 'Status'}</TableHead>
                    <TableHead>{t.ssl?.user || 'User'}</TableHead>
                    <TableHead>{t.ssl?.expires || 'Expires'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow 
                      key={cert.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => window.location.href = `/admin/ssl-certificates/${cert.id}`}
                    >
                      <TableCell className="font-medium">{cert.domain}</TableCell>
                      <TableCell>
                        <Badge variant={cert.domainType === 'SUBDOMAIN' ? 'secondary' : 'outline'}>
                          {cert.domainType === 'SUBDOMAIN' ? t.ssl?.subdomain || 'Subdomain' : t.ssl?.custom || 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>{providerLabels[cert.provider]}</TableCell>
                      <TableCell><StatusBadge status={cert.status} /></TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{cert.hosting?.user?.email || '-'}</div>
                          <div className="text-muted-foreground text-xs">{cert.hosting?.domain || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t.ssl?.showing || 'Showing'} {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t.ssl?.of || 'of'} {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => fetchCertificates(pagination.page - 1)}
                  >
                    {t.common?.previous || 'Previous'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => fetchCertificates(pagination.page + 1)}
                  >
                    {t.common?.next || 'Next'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
