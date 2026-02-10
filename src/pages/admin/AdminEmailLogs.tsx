import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  History,
  Mail
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface EmailLog {
  id: string;
  templateId: string | null;
  toEmail: string;
  subject: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  template?: {
    name: string;
    code: string;
  } | null;
}

export default function AdminEmailLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.emailLogs || 'Email Logs');
  const token = authService.getAccessToken();

  // Logs State
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load data
  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      
      const res = await fetch(`${API_URL}/api/email/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setLogsTotalPages(data.totalPages);
        setLogsPage(data.page);
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
      toast({ 
        title: t.common?.error || "Error", 
        description: t.admin?.failedToLoadLogs || "Failed to load email logs", 
        variant: "destructive" 
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSearch = () => {
    setLogsPage(1);
    fetchLogs(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t.admin?.emailSent || 'Sent'}
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t.admin?.emailFailed || 'Failed'}
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t.admin?.emailPending || 'Pending'}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            {t.admin?.emailLogs || 'Email Logs'}
          </h1>
          <p className="text-muted-foreground">
            {t.admin?.emailLogsDescription || 'View email sending history and status'}
          </p>
        </div>

        {/* Logs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t.admin?.emailHistory || 'Email History'}
              </CardTitle>
              <CardDescription>
                {t.admin?.trackSentEmails || 'Track sent emails and their status'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(logsPage)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
              {t.common?.refresh || 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.admin?.searchEmailLogs || "Search by email or subject..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t.admin?.filterByStatus || "Filter by status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common?.all || 'All'}</SelectItem>
                  <SelectItem value="PENDING">{t.admin?.emailPending || 'Pending'}</SelectItem>
                  <SelectItem value="SENT">{t.admin?.emailSent || 'Sent'}</SelectItem>
                  <SelectItem value="FAILED">{t.admin?.emailFailed || 'Failed'}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={logsLoading}>
                <Search className="h-4 w-4 mr-2" />
                {t.common?.search || 'Search'}
              </Button>
            </div>

            {/* Table */}
            {logsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.admin?.noEmailLogs || 'No email logs yet'}</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.admin?.emailTo || 'To'}</TableHead>
                        <TableHead>{t.admin?.emailSubject || 'Subject'}</TableHead>
                        <TableHead>{t.common?.status || 'Status'}</TableHead>
                        <TableHead>{t.admin?.emailTemplate || 'Template'}</TableHead>
                        <TableHead>{t.admin?.emailSentAt || 'Sent At'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            <span className="truncate max-w-[200px] block" title={log.toEmail}>
                              {log.toEmail}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="truncate max-w-[250px] block" title={log.subject}>
                              {log.subject}
                            </span>
                            {log.error && (
                              <p className="text-xs text-destructive truncate max-w-[250px]" title={log.error}>
                                {log.error}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>
                            {log.template ? (
                              <Badge variant="outline">{log.template.name || log.template.code}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {t.admin?.customEmail || 'Custom'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(log.sentAt || log.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {logsTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={logsPage === 1 || logsLoading}
                      onClick={() => fetchLogs(logsPage - 1)}
                    >
                      {t.common?.previous || 'Previous'}
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                      {t.admin?.page || 'Page'} {logsPage} {t.admin?.of || 'of'} {logsTotalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={logsPage === logsTotalPages || logsLoading}
                      onClick={() => fetchLogs(logsPage + 1)}
                    >
                      {t.common?.next || 'Next'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
