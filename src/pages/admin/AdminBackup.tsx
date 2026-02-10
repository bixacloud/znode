import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Database, 
  Cloud, 
  Server, 
  Plus, 
  Trash2, 
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  Calendar,
  FolderArchive,
  Eye,
  EyeOff,
  TestTube2,
  LogIn,
  LogOut,
  History,
  Upload,
  Play,
  Download,
  RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface BackupConfig {
  id: string;
  name: string;
  storageType: 'FTP' | 'SFTP' | 'GOOGLE_DRIVE';
  localPath?: string;
  ftpHost?: string;
  ftpPort?: number;
  ftpUsername?: string;
  ftpPassword?: string;
  ftpPath?: string;
  ftpSecure?: boolean;
  googleDriveEmail?: string;
  googleDriveFolderId?: string;
  scheduleEnabled: boolean;
  scheduleType?: 'DAILY' | 'WEEKLY';
  scheduleTime?: string;
  scheduleDays?: string;
  retentionDays: number;
  includeDatabase: boolean;
  includeUploads: boolean;
  isActive: boolean;
  lastBackupAt?: string;
  createdAt: string;
  _count?: { backups: number };
  hasConfiguredPassword?: boolean;
  hasGoogleDriveConnected?: boolean;
}

interface BackupHistory {
  id: string;
  configId?: string;
  config?: { name: string; storageType: string };
  filename: string;
  fileSize: number;
  storageType: string;
  storagePath: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  isManual: boolean;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

const storageTypeIcons = {
  FTP: Server,
  SFTP: Server,
  GOOGLE_DRIVE: Cloud,
};

const storageTypeLabels = {
  FTP: 'FTP',
  SFTP: 'SFTP',
  GOOGLE_DRIVE: 'Google Drive',
};

export default function AdminBackup() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<BackupConfig[]>([]);
  const [history, setHistory] = useState<BackupHistory[]>([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BackupConfig | null>(null);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('configs');

  // Pending Google tokens from OAuth callback
  const [pendingGoogleTokens, setPendingGoogleTokens] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    storageType: 'GOOGLE_DRIVE' as BackupConfig['storageType'],
    localPath: '',
    ftpHost: '',
    ftpPort: 21,
    ftpUsername: '',
    ftpPassword: '',
    ftpPath: '/',
    ftpSecure: false,
    scheduleEnabled: false,
    scheduleType: 'DAILY' as 'DAILY' | 'WEEKLY',
    scheduleTime: '03:00',
    scheduleDays: '0',
    retentionDays: 30,
    includeDatabase: true,
    includeUploads: true,
    isActive: true,
  });

  // Handle OAuth callback params
  useEffect(() => {
    const googleParam = searchParams.get('google');
    const tokensParam = searchParams.get('tokens');
    const errorParam = searchParams.get('error');
    const configIdParam = searchParams.get('configId');

    if (errorParam) {
      toast({ 
        variant: 'destructive', 
        title: t.backup?.googleConnectFailed || 'Google Drive connection failed',
        description: errorParam 
      });
      setSearchParams({});
    } else if (googleParam === 'connected') {
      if (tokensParam) {
        // New config - decode tokens
        try {
          const tokenData = JSON.parse(atob(tokensParam));
          setPendingGoogleTokens(tokenData);
          setFormData(prev => ({ ...prev, storageType: 'GOOGLE_DRIVE' }));
          setShowConfigDialog(true);
          toast({ title: t.backup?.googleConnected || 'Google Drive connected' });
        } catch (e) {
          console.error('Failed to parse Google tokens:', e);
        }
      } else if (configIdParam) {
        // Existing config updated
        toast({ title: t.backup?.googleConnected || 'Google Drive connected' });
        fetchConfigs();
      }
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, t]);

  const fetchConfigs = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Failed to fetch backup configs:', error);
    }
  }, []);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/history?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.data);
        setHistoryPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch backup history:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchConfigs(), fetchHistory()]);
      setLoading(false);
    };
    init();
  }, [fetchConfigs, fetchHistory]);

  const resetForm = () => {
    setFormData({
      name: '',
      storageType: 'GOOGLE_DRIVE',
      localPath: '',
      ftpHost: '',
      ftpPort: 21,
      ftpUsername: '',
      ftpPassword: '',
      ftpPath: '/',
      ftpSecure: false,
      scheduleEnabled: false,
      scheduleType: 'DAILY',
      scheduleTime: '03:00',
      scheduleDays: '0',
      retentionDays: 30,
      includeDatabase: true,
      includeUploads: true,
      isActive: true,
    });
    setEditingConfig(null);
    setPendingGoogleTokens(null);
  };

  const handleEditConfig = (config: BackupConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      storageType: config.storageType,
      localPath: '',
      ftpHost: config.ftpHost || '',
      ftpPort: config.ftpPort || 21,
      ftpUsername: config.ftpUsername || '',
      ftpPassword: '',
      ftpPath: config.ftpPath || '/',
      ftpSecure: config.ftpSecure || false,
      scheduleEnabled: config.scheduleEnabled,
      scheduleType: config.scheduleType || 'DAILY',
      scheduleTime: config.scheduleTime || '03:00',
      scheduleDays: config.scheduleDays || '0',
      retentionDays: config.retentionDays,
      includeDatabase: config.includeDatabase,
      includeUploads: config.includeUploads,
      isActive: config.isActive,
    });
    setShowConfigDialog(true);
  };

  const handleConnectGoogleDrive = async (configId?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = configId 
        ? `${API_URL}/api/backup/google/auth?configId=${configId}`
        : `${API_URL}/api/backup/google/auth`;
        
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        const error = await response.json();
        toast({ 
          variant: 'destructive', 
          title: t.common?.error || 'Error', 
          description: error.error 
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    }
  };

  const handleDisconnectGoogleDrive = async (configId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/google/disconnect/${configId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast({ title: t.backup?.googleDisconnected || 'Google Drive disconnected' });
        fetchConfigs();
        if (editingConfig?.id === configId) {
          setEditingConfig({ ...editingConfig, hasGoogleDriveConnected: false, googleDriveEmail: undefined });
        }
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/configs/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          configId: editingConfig?.id,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast({ title: t.backup?.connectionSuccess || 'Connection successful' });
      } else {
        toast({ 
          variant: 'destructive', 
          title: t.backup?.connectionFailed || 'Connection failed',
          description: data.error 
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingConfig 
        ? `${API_URL}/api/backup/configs/${editingConfig.id}`
        : `${API_URL}/api/backup/configs`;
      
      // Include pending Google tokens for new config
      const payload: any = { ...formData };
      if (pendingGoogleTokens && !editingConfig) {
        payload.googleDriveAccessToken = pendingGoogleTokens.accessToken;
        payload.googleDriveRefreshToken = pendingGoogleTokens.refreshToken;
        payload.googleDriveTokenExpiry = pendingGoogleTokens.expiryDate;
        payload.googleDriveEmail = pendingGoogleTokens.email;
      }

      const response = await fetch(url, {
        method: editingConfig ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({ title: t.common?.saved || 'Saved successfully' });
        setShowConfigDialog(false);
        resetForm();
        fetchConfigs();
      } else {
        const error = await response.json();
        toast({ variant: 'destructive', title: t.common?.error || 'Error', description: error.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/configs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({ title: t.common?.deleted || 'Deleted successfully' });
        fetchConfigs();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    }
  };

  const handleCreateBackup = async (configId?: string) => {
    setBackupInProgress(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          configId,
          includeDatabase: true,
          includeUploads: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ 
          title: t.backup?.backupCreated || 'Backup created',
          description: data.filename,
        });
        fetchHistory();
        fetchConfigs();
        setActiveTab('history');
      } else {
        toast({ variant: 'destructive', title: t.common?.error || 'Error', description: data.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    setRestoreInProgress(backupId);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/restore/${backupId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast({ 
          title: t.backup?.restoreSuccess || 'Restore completed',
          description: t.backup?.loggingOut || 'Logging out to apply changes...'
        });
        
        // Clear auth and redirect to login after 2 seconds
        setTimeout(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else {
        toast({ variant: 'destructive', title: t.common?.error || 'Error', description: data.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    } finally {
      setRestoreInProgress(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/backup/history/${backupId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({ title: t.common?.deleted || 'Deleted' });
        fetchHistory();
      }
    } catch (error) {
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: BackupHistory['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />{t.backup?.completed || 'Completed'}</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t.backup?.failed || 'Failed'}</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{t.backup?.inProgress || 'In Progress'}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t.backup?.pending || 'Pending'}</Badge>;
    }
  };

  const completedBackups = history.filter(b => b.status === 'COMPLETED');

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const weekDays = [
    { value: '0', label: t.backup?.sunday || 'Sunday' },
    { value: '1', label: t.backup?.monday || 'Monday' },
    { value: '2', label: t.backup?.tuesday || 'Tuesday' },
    { value: '3', label: t.backup?.wednesday || 'Wednesday' },
    { value: '4', label: t.backup?.thursday || 'Thursday' },
    { value: '5', label: t.backup?.friday || 'Friday' },
    { value: '6', label: t.backup?.saturday || 'Saturday' },
  ];

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.backup?.title || 'Backup & Restore'}</h1>
          <p className="text-muted-foreground">{t.backup?.description || 'Manage database and file backups'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetForm(); setShowConfigDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {t.backup?.addConfig || 'Add Configuration'}
          </Button>
          <Button onClick={() => handleCreateBackup()} disabled={backupInProgress}>
            {backupInProgress ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {t.backup?.createBackup || 'Create Backup'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configs">
            <Settings className="h-4 w-4 mr-2" />
            {t.backup?.configurations || 'Configurations'}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            {t.backup?.history || 'History'}
          </TabsTrigger>
          <TabsTrigger value="restore">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t.backup?.restore || 'Restore'}
          </TabsTrigger>
        </TabsList>

        {/* Configurations Tab */}
        <TabsContent value="configs" className="space-y-4">
          {configs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FolderArchive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.backup?.noConfigs || 'No backup configurations yet'}</p>
                <Button className="mt-4" onClick={() => { resetForm(); setShowConfigDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.backup?.addConfig || 'Add Configuration'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {configs.map((config) => {
                const Icon = storageTypeIcons[config.storageType];
                return (
                  <Card key={config.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          {config.name}
                        </CardTitle>
                        <Badge variant={config.isActive ? 'default' : 'secondary'}>
                          {config.isActive ? t.common?.active || 'Active' : t.common?.inactive || 'Inactive'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {storageTypeLabels[config.storageType]}
                        {config.googleDriveEmail && ` • ${config.googleDriveEmail}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span>{config.includeDatabase ? t.backup?.includesDatabase || 'Database' : ''}</span>
                          {config.includeUploads && <span>{t.backup?.includesUploads || 'Uploads'}</span>}
                        </div>
                        {config.scheduleEnabled && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {config.scheduleType === 'DAILY' ? t.backup?.daily || 'Daily' : t.backup?.weekly || 'Weekly'}
                              {' '}{t.backup?.at || 'at'} {config.scheduleTime}
                            </span>
                          </div>
                        )}
                        {config.lastBackupAt && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{t.backup?.lastBackup || 'Last'}: {formatDate(config.lastBackupAt)}</span>
                          </div>
                        )}
                        <div className="text-muted-foreground">
                          {config._count?.backups || 0} {t.backup?.backups || 'backups'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleCreateBackup(config.id)} disabled={backupInProgress}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditConfig(config)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.backup?.deleteConfig || 'Delete Configuration'}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.backup?.deleteConfigConfirm || 'Are you sure you want to delete this configuration?'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.common?.cancel || 'Cancel'}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteConfig(config.id)}>
                                {t.common?.delete || 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t.backup?.backupHistory || 'Backup History'}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => fetchHistory()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.common?.refresh || 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t.backup?.noHistory || 'No backup history yet'}</p>
                  <p className="text-sm mt-2">{t.backup?.createFirstBackup || 'Create your first backup to see it here'}</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.backup?.filename || 'Filename'}</TableHead>
                        <TableHead>{t.backup?.config || 'Config'}</TableHead>
                        <TableHead>{t.backup?.size || 'Size'}</TableHead>
                        <TableHead>{t.backup?.status || 'Status'}</TableHead>
                        <TableHead>{t.backup?.date || 'Date'}</TableHead>
                        <TableHead className="text-right">{t.common?.actions || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                          <TableCell>{backup.config?.name || '-'}</TableCell>
                          <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                          <TableCell>{getStatusBadge(backup.status)}</TableCell>
                          <TableCell>{formatDate(backup.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {backup.status === 'COMPLETED' && backup.storageType === 'LOCAL' && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`${API_URL}/api/backup/download/${backup.id}?token=${localStorage.getItem('accessToken')}`}>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t.backup?.deleteBackup || 'Delete Backup'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t.backup?.deleteBackupConfirm || 'Are you sure you want to delete this backup?'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t.common?.cancel || 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBackup(backup.id)}>
                                      {t.common?.delete || 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {historyPagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchHistory(historyPagination.page - 1)}
                        disabled={historyPagination.page === 1}
                      >
                        {t.common?.previous || 'Previous'}
                      </Button>
                      <span className="py-2 px-4 text-sm">
                        {historyPagination.page} / {historyPagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchHistory(historyPagination.page + 1)}
                        disabled={historyPagination.page === historyPagination.totalPages}
                      >
                        {t.common?.next || 'Next'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="space-y-4">
          {/* Existing Backups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                {t.backup?.restoreFromBackup || 'Restore from Backup'}
              </CardTitle>
              <CardDescription>
                {t.backup?.restoreDescription || 'Select a completed backup to restore your data'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedBackups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t.backup?.noCompletedBackups || 'No completed backups available'}</p>
                  <p className="text-sm mt-2">{t.backup?.connectStorageFirst || 'Connect to a storage (Google Drive or FTP) to see available backups'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ {t.backup?.restoreWarning || 'Restoring will overwrite current data. You will be logged out after restore to avoid conflicts with restored data.'}
                    </p>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.backup?.filename || 'Filename'}</TableHead>
                        <TableHead>{t.backup?.storage || 'Storage'}</TableHead>
                        <TableHead>{t.backup?.size || 'Size'}</TableHead>
                        <TableHead>{t.backup?.date || 'Date'}</TableHead>
                        <TableHead className="text-right">{t.common?.actions || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedBackups.map((backup) => {
                        const Icon = storageTypeIcons[backup.storageType as keyof typeof storageTypeIcons] || Server;
                        return (
                          <TableRow key={backup.id}>
                            <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {storageTypeLabels[backup.storageType as keyof typeof storageTypeLabels] || backup.storageType}
                              </div>
                            </TableCell>
                            <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                            <TableCell>{formatDate(backup.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    disabled={restoreInProgress === backup.id}
                                  >
                                    {restoreInProgress === backup.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                    )}
                                    {t.backup?.restore || 'Restore'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t.backup?.confirmRestore || 'Confirm Restore'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t.backup?.restoreConfirmMessage || 'This action will overwrite all current data with data from this backup. This cannot be undone. Are you sure you want to continue?'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t.common?.cancel || 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleRestore(backup.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {t.backup?.confirmRestoreButton || 'Yes, Restore'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={(open) => { 
        if (!open) resetForm(); 
        setShowConfigDialog(open); 
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? t.backup?.editConfig || 'Edit Configuration' : t.backup?.addConfig || 'Add Configuration'}
            </DialogTitle>
            <DialogDescription>
              {t.backup?.configDescription || 'Configure backup storage and schedule'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.backup?.configName || 'Configuration Name'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.backup?.configNamePlaceholder || 'My Backup'}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.backup?.storageType || 'Storage Type'}</Label>
                <Select
                  value={formData.storageType}
                  onValueChange={(value) => setFormData({ ...formData, storageType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOGLE_DRIVE">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" /> Google Drive
                      </div>
                    </SelectItem>
                    <SelectItem value="FTP">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" /> FTP
                      </div>
                    </SelectItem>
                    <SelectItem value="SFTP">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" /> SFTP
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Storage-specific settings */}
            {(formData.storageType === 'FTP' || formData.storageType === 'SFTP') && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t.backup?.ftpHost || 'Host'}</Label>
                    <Input
                      value={formData.ftpHost}
                      onChange={(e) => setFormData({ ...formData, ftpHost: e.target.value })}
                      placeholder="ftp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.backup?.ftpPort || 'Port'}</Label>
                    <Input
                      type="number"
                      value={formData.ftpPort}
                      onChange={(e) => setFormData({ ...formData, ftpPort: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t.backup?.ftpUsername || 'Username'}</Label>
                    <Input
                      value={formData.ftpUsername}
                      onChange={(e) => setFormData({ ...formData, ftpUsername: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {t.backup?.ftpPassword || 'Password'}
                      {editingConfig?.hasConfiguredPassword && formData.ftpPassword === '' && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          ✓ {t.backup?.configured || 'Configured'}
                        </Badge>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.ftpPassword}
                        onChange={(e) => setFormData({ ...formData, ftpPassword: e.target.value })}
                        placeholder={editingConfig?.hasConfiguredPassword ? '••••••••' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {editingConfig?.hasConfiguredPassword && (
                      <p className="text-xs text-muted-foreground">
                        {t.backup?.leaveEmptyToKeep || 'Leave empty to keep existing password'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.backup?.ftpPath || 'Remote Path'}</Label>
                  <Input
                    value={formData.ftpPath}
                    onChange={(e) => setFormData({ ...formData, ftpPath: e.target.value })}
                    placeholder="/backups"
                  />
                </div>
                {formData.storageType === 'FTP' && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.ftpSecure}
                      onCheckedChange={(checked) => setFormData({ ...formData, ftpSecure: checked })}
                    />
                    <Label>{t.backup?.ftpSecure || 'Use FTPS (FTP over TLS)'}</Label>
                  </div>
                )}
              </div>
            )}

            {formData.storageType === 'GOOGLE_DRIVE' && (
              <div className="space-y-4">
                {/* Google Drive Connection Status */}
                {editingConfig?.hasGoogleDriveConnected || pendingGoogleTokens ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">
                            {t.backup?.googleConnectedAs || 'Connected to Google Drive'}
                          </p>
                          {(editingConfig?.googleDriveEmail || pendingGoogleTokens?.email) && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                              {editingConfig?.googleDriveEmail || pendingGoogleTokens?.email}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.backup?.autoFolderNote || 'Backups will be saved in "zbackup" folder automatically'}
                          </p>
                        </div>
                      </div>
                      {editingConfig && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDisconnectGoogleDrive(editingConfig.id)}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          {t.backup?.disconnect || 'Disconnect'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t.backup?.googleDriveNotConnected || 'Connect your Google account to backup to Google Drive'}
                    </p>
                    <Button onClick={() => handleConnectGoogleDrive(editingConfig?.id)}>
                      <LogIn className="h-4 w-4 mr-2" />
                      {t.backup?.connectGoogleDrive || 'Connect Google Drive'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Test Connection - only for FTP/SFTP */}
            {(formData.storageType === 'FTP' || formData.storageType === 'SFTP') && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
                  {testingConnection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube2 className="h-4 w-4 mr-2" />}
                  {t.backup?.testConnection || 'Test Connection'}
                </Button>
              </div>
            )}

            <hr className="my-4" />

            {/* Schedule settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.scheduleEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, scheduleEnabled: checked })}
                />
                <Label>{t.backup?.enableSchedule || 'Enable Automatic Backup'}</Label>
              </div>

              {formData.scheduleEnabled && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t.backup?.scheduleType || 'Frequency'}</Label>
                    <Select
                      value={formData.scheduleType}
                      onValueChange={(value) => setFormData({ ...formData, scheduleType: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">{t.backup?.daily || 'Daily'}</SelectItem>
                        <SelectItem value="WEEKLY">{t.backup?.weekly || 'Weekly'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.backup?.scheduleTime || 'Time'}</Label>
                    <Input
                      type="time"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    />
                  </div>
                  {formData.scheduleType === 'WEEKLY' && (
                    <div className="space-y-2">
                      <Label>{t.backup?.scheduleDay || 'Day'}</Label>
                      <Select
                        value={formData.scheduleDays}
                        onValueChange={(value) => setFormData({ ...formData, scheduleDays: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekDays.map((day) => (
                            <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="my-4" />

            {/* Backup content settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeDatabase}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeDatabase: checked })}
                />
                <Label>{t.backup?.includeDatabase || 'Include Database'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeUploads}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeUploads: checked })}
                />
                <Label>{t.backup?.includeUploads || 'Include Uploaded Files'}</Label>
              </div>
              <div className="space-y-2">
                <Label>{t.backup?.retentionDays || 'Retention (days)'}</Label>
                <Input
                  type="number"
                  value={formData.retentionDays}
                  onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
                  min={1}
                  max={365}
                />
                <p className="text-xs text-muted-foreground">
                  {t.backup?.retentionHelp || 'Automatic backups older than this will be deleted'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>{t.backup?.isActive || 'Configuration Active'}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfigDialog(false); resetForm(); }}>
              {t.common?.cancel || 'Cancel'}
            </Button>
            <Button 
              onClick={handleSaveConfig}
              disabled={formData.storageType === 'GOOGLE_DRIVE' && !editingConfig?.hasGoogleDriveConnected && !pendingGoogleTokens}
            >
              {t.common?.save || 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
