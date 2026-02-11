import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server, Database, Shield, User, Mail, Lock, Eye, EyeOff,
  ArrowRight, ArrowLeft, CheckCircle, Loader2, Upload,
  FileArchive, AlertTriangle, RotateCcw, Globe, Settings,
  Sparkles, XCircle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

type InstallMode = 'fresh' | 'restore';
type Step = 'language' | 'welcome' | 'database' | 'admin' | 'site' | 'installing' | 'complete' | 'restore-upload' | 'restore-progress';

interface InstallConfig {
  databaseUrl: string;
  port: string;
  frontendUrl: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  siteName: string;
  siteSlogan: string;
}

export default function Install() {
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refetch: refetchSiteSettings } = useSite();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('language');
  const [mode, setMode] = useState<InstallMode>('fresh');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStep, setInstallStep] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');

  const [config, setConfig] = useState<InstallConfig>({
    databaseUrl: '',
    port: '3002',
    frontendUrl: typeof window !== 'undefined' ? window.location.origin : '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    siteName: 'ZNode',
    siteSlogan: 'Free Web Hosting',
  });

  // Check if already installed
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/install/status`);
        const data = await res.json();
        if (data.installed) {
          navigate('/login', { replace: true });
          return;
        }
        // Pre-fill config from existing .env (set by install.sh)
        if (data.hasEnv && data.config) {
          setConfig(prev => ({
            ...prev,
            port: data.config.port || prev.port,
            frontendUrl: data.config.frontendUrl || prev.frontendUrl,
          }));
        }
      } catch {
        // API not available - that's ok for fresh install
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const updateConfig = (key: keyof InstallConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const getDbTestMessage = (code: string, meta?: Record<string, string>) => {
    const messages: Record<string, string> = {
      connection_success: t.install?.dbTestSuccess || 'Database connection successful!',
      connection_refused: t.install?.dbTestRefused || 'Connection refused. Check host/port.',
      host_not_found: t.install?.dbTestHostNotFound || 'Host not found. Check your database host address.',
      auth_failed: t.install?.dbTestAuthFailed || 'Authentication failed. Check username and password.',
      db_not_found: (t.install?.dbTestDbNotFound || "Database '{name}' does not exist. Create it first.").replace('{name}', meta?.dbName || ''),
      connection_timeout: t.install?.dbTestTimeout || 'Connection timed out. Check if the database server is reachable.',
      server_unreachable: t.install?.dbTestUnreachable || 'Cannot reach database server. Check if it is running.',
      invalid_url: t.install?.dbTestInvalidUrl || 'Invalid database URL format.',
      unknown_error: t.install?.dbTestUnknown || 'Unknown connection error.',
    };
    return messages[code] || messages['unknown_error'];
  };

  const testDatabase = async () => {
    setTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetch(`${API_URL}/api/install/test-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseUrl: config.databaseUrl }),
      });
      const data = await res.json();
      setDbTestResult({ success: data.success, message: getDbTestMessage(data.code, data.meta) });
    } catch (error: any) {
      setDbTestResult({ success: false, message: t.install?.connectionFailed || 'Connection failed' });
    } finally {
      setTestingDb(false);
    }
  };

  const passwordRequirements = [
    { label: t.auth?.passwordRequirements?.minLength || 'At least 8 characters', met: config.adminPassword.length >= 8 },
    { label: t.auth?.passwordRequirements?.uppercase || 'One uppercase letter', met: /[A-Z]/.test(config.adminPassword) },
    { label: t.auth?.passwordRequirements?.number || 'One number', met: /[0-9]/.test(config.adminPassword) },
  ];

  const canProceedAdmin = config.adminEmail && config.adminPassword.length >= 8 &&
    /[A-Z]/.test(config.adminPassword) && /[0-9]/.test(config.adminPassword) &&
    config.adminPassword === confirmPassword;

  const runInstall = async () => {
    setStep('installing');
    setInstalling(true);
    setInstallProgress(0);

    try {
      // Simulate progress steps
      setInstallStep(t.install?.creatingEnv || 'Creating environment configuration...');
      setInstallProgress(10);
      await new Promise(r => setTimeout(r, 500));

      setInstallStep(t.install?.runningMigrations || 'Running database migrations...');
      setInstallProgress(25);

      setInstallStep(t.install?.creatingAdmin || 'Creating admin account...');
      setInstallProgress(50);

      const res = await fetch(`${API_URL}/api/install/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInstallStep(t.install?.seedingData || 'Seeding default data...');
      setInstallProgress(85);
      await new Promise(r => setTimeout(r, 800));

      setInstallProgress(90);
      setInstallStep(t.install?.restartingServer || 'Restarting server...');

      // Wait for server to restart (PM2 auto-restart after process.exit)
      await new Promise(r => setTimeout(r, 3000));

      // Poll until server is back online
      let retries = 0;
      const maxRetries = 30;
      while (retries < maxRetries) {
        try {
          const healthRes = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) });
          if (healthRes.ok) break;
        } catch {
          // Server still restarting
        }
        retries++;
        await new Promise(r => setTimeout(r, 2000));
      }

      setInstallProgress(100);
      setInstallStep(t.install?.completed || 'Installation completed!');
      await new Promise(r => setTimeout(r, 500));

      // Refresh site settings so siteName/logo update immediately
      refetchSiteSettings();

      setStep('complete');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t.install?.installFailed || 'Installation Failed',
        description: error.message,
      });
      setStep('site'); // Go back to last step
    } finally {
      setInstalling(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip') && !file.name.endsWith('.sql.gz') && !file.name.endsWith('.sql')) {
        toast({
          variant: 'destructive',
          title: t.setup?.invalidFile || 'Invalid file',
          description: t.setup?.invalidFileDesc || 'Please select a .zip, .sql.gz or .sql backup file',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const runRestore = async () => {
    if (!selectedFile) return;

    // First save .env
    setStep('restore-progress');
    setUploading(true);
    setUploadProgress(0);

    try {
      // Save env first
      const envRes = await fetch(`${API_URL}/api/install/save-env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseUrl: config.databaseUrl,
          frontendUrl: config.frontendUrl,
          port: config.port,
        }),
      });
      if (!envRes.ok) {
        const envData = await envRes.json();
        throw new Error(envData.error);
      }

      // Upload and restore
      const formData = new FormData();
      formData.append('backup', selectedFile);

      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || 'Restore failed'));
            } catch {
              reject(new Error('Restore failed'));
            }
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('POST', `${API_URL}/api/install/restore`);
        xhr.send(formData);
      });

      setUploadStep(t.install?.restartingServer || 'Restarting server...');
      setUploadProgress(100);

      // Wait for server to restart
      await new Promise(r => setTimeout(r, 3000));

      let retries = 0;
      const maxRetries = 30;
      while (retries < maxRetries) {
        try {
          const healthRes = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) });
          if (healthRes.ok) break;
        } catch {
          // Server still restarting
        }
        retries++;
        await new Promise(r => setTimeout(r, 2000));
      }

      // Refresh site settings so siteName/logo update immediately
      refetchSiteSettings();

      setStep('complete');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t.common?.error || 'Error',
        description: error.message,
      });
      setStep('restore-upload');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Progress indicator
  const steps: { key: Step; label: string; icon: React.ReactNode }[] = mode === 'fresh' ? [
    { key: 'language', label: t.install?.stepLanguage || 'Language', icon: <Globe className="w-4 h-4" /> },
    { key: 'welcome', label: t.install?.stepWelcome || 'Welcome', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'database', label: t.install?.stepDatabase || 'Database', icon: <Database className="w-4 h-4" /> },
    { key: 'admin', label: t.install?.stepAdmin || 'Admin', icon: <Shield className="w-4 h-4" /> },
    { key: 'site', label: t.install?.stepSite || 'Site', icon: <Globe className="w-4 h-4" /> },
  ] : [
    { key: 'language', label: t.install?.stepLanguage || 'Language', icon: <Globe className="w-4 h-4" /> },
    { key: 'welcome', label: t.install?.stepWelcome || 'Welcome', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'database', label: t.install?.stepDatabase || 'Database', icon: <Database className="w-4 h-4" /> },
    { key: 'restore-upload', label: t.install?.stepRestore || 'Restore', icon: <Upload className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const isCompletionStep = step === 'installing' || step === 'complete' || step === 'restore-progress';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left sidebar - stepper */}
      <div className="hidden lg:flex lg:w-80 bg-gradient-hero flex-col p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary-foreground">ZNode</h2>
            <p className="text-xs text-primary-foreground/60">{t.install?.installer || 'Installation Wizard'}</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="space-y-1">
            {steps.map((s, i) => {
              const isActive = s.key === step;
              const isDone = !isCompletionStep && currentStepIndex > i;
              const isDisabled = !isCompletionStep && currentStepIndex < i;
              return (
                <div key={s.key} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-primary-foreground/15 text-primary-foreground' :
                  isDone ? 'text-primary-foreground/80' :
                  'text-primary-foreground/40'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone ? 'bg-green-500/20 border-green-400 text-green-400' :
                    isActive ? 'border-primary-foreground bg-primary-foreground/10' :
                    'border-primary-foreground/30'
                  }`}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : s.icon}
                  </div>
                  <span className={`text-sm font-medium ${isDisabled ? 'opacity-50' : ''}`}>{s.label}</span>
                </div>
              );
            })}
            {isCompletionStep && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-foreground/15 text-primary-foreground">
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-primary-foreground bg-primary-foreground/10">
                  {step === 'complete' ? <CheckCircle className="w-4 h-4" /> : <Settings className="w-4 h-4 animate-spin" />}
                </div>
                <span className="text-sm font-medium">
                  {step === 'complete' ? (t.install?.done || 'Done!') : (t.install?.installing || 'Installing...')}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/40 mt-auto">
          {t.install?.version || 'ZNode v2.0'}
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg">

          {/* STEP: Language */}
          {step === 'language' && (
            <div className="space-y-8">
              {/* Mobile header */}
              <div className="flex lg:hidden items-center gap-3 justify-center mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">ZNode</span>
              </div>

              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold text-foreground mb-3">
                  🌐 Select Language
                </h1>
                <p className="text-muted-foreground text-lg">
                  Choose your preferred language for the installation wizard.
                </p>
              </div>

              <div className="grid gap-3">
                {availableLanguages.map((lang) => (
                  <Card
                    key={lang.code}
                    className={`cursor-pointer transition-all border-2 ${
                      language === lang.code ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setLanguage(lang.code)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <span className="text-3xl">{lang.flag}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{lang.nativeName}</h3>
                        <p className="text-sm text-muted-foreground">{lang.name}</p>
                      </div>
                      {language === lang.code && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button size="lg" className="w-full" onClick={() => setStep('welcome')}>
                {t.common?.next || 'Next'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* STEP: Welcome */}
          {step === 'welcome' && (
            <div className="space-y-8">
              {/* Mobile header */}
              <div className="flex lg:hidden items-center gap-3 justify-center mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">ZNode</span>
              </div>

              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold text-foreground mb-3">
                  {t.install?.welcomeTitle || 'Welcome to ZNode'}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {t.install?.welcomeDesc || 'Set up your free hosting platform in just a few steps.'}
                </p>
              </div>

              <div className="grid gap-4">
                <Card
                  className={`cursor-pointer transition-all border-2 ${mode === 'fresh' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setMode('fresh')}
                >
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${mode === 'fresh' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {t.install?.freshInstall || 'Fresh Installation'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t.install?.freshInstallDesc || 'Set up a new ZNode platform from scratch with default data and create your admin account.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all border-2 ${mode === 'restore' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setMode('restore')}
                >
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${mode === 'restore' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {t.install?.restoreFromBackup || 'Restore from Backup'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t.install?.restoreFromBackupDesc || 'Migrate from another server by restoring a backup file. Your settings, users, and data will be preserved.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-shrink-0" onClick={() => setStep('language')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button size="lg" className="w-full" onClick={() => setStep('database')}>
                  {t.install?.getStarted || 'Get Started'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP: Database */}
          {step === 'database' && (
            <div className="space-y-6">
              <div>
                <Button variant="ghost" size="sm" onClick={() => setStep('welcome')} className="mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> {t.common?.back || 'Back'}
                </Button>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t.install?.databaseConfig || 'Database Configuration'}
                </h1>
                <p className="text-muted-foreground">
                  {t.install?.databaseConfigDesc || 'Connect to your MySQL/MariaDB database.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.install?.databaseUrl || 'Database URL'}</Label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="mysql://user:pass@localhost:3306/znode"
                      value={config.databaseUrl}
                      onChange={(e) => { updateConfig('databaseUrl', e.target.value); setDbTestResult(null); }}
                      className="pl-10 h-12 font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.install?.databaseUrlHint || 'Format: mysql://username:password@host:port/database_name'}
                  </p>
                </div>

                {dbTestResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    dbTestResult.success ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {dbTestResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    {dbTestResult.message}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!config.databaseUrl || testingDb}
                  onClick={testDatabase}
                >
                  {testingDb ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.install?.testing || 'Testing...'}</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> {t.install?.testConnection || 'Test Connection'}</>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.install?.serverPort || 'Server Port'}</Label>
                    <Input
                      value={config.port}
                      onChange={(e) => updateConfig('port', e.target.value)}
                      placeholder="3002"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.install?.frontendUrl || 'Frontend URL'}</Label>
                    <Input
                      value={config.frontendUrl}
                      onChange={(e) => updateConfig('frontendUrl', e.target.value)}
                      placeholder="https://example.com"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              <Button
                size="lg" className="w-full"
                disabled={!config.databaseUrl || !dbTestResult?.success}
                onClick={() => setStep(mode === 'fresh' ? 'admin' : 'restore-upload')}
              >
                {t.common?.next || 'Next'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* STEP: Admin Account (fresh only) */}
          {step === 'admin' && (
            <div className="space-y-6">
              <div>
                <Button variant="ghost" size="sm" onClick={() => setStep('database')} className="mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> {t.common?.back || 'Back'}
                </Button>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t.install?.createAdmin || 'Create Admin Account'}
                </h1>
                <p className="text-muted-foreground">
                  {t.install?.createAdminDesc || 'Set up your administrator account to manage the platform.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.auth?.fullName || 'Full Name'}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Admin"
                      value={config.adminName}
                      onChange={(e) => updateConfig('adminName', e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.auth?.email || 'Email'} *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      value={config.adminEmail}
                      onChange={(e) => updateConfig('adminEmail', e.target.value)}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.auth?.password || 'Password'} *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={config.adminPassword}
                      onChange={(e) => updateConfig('adminPassword', e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {config.adminPassword && (
                    <div className="space-y-1.5 mt-2">
                      {passwordRequirements.map(req => (
                        <div key={req.label} className={`flex items-center gap-2 text-sm ${req.met ? 'text-green-500' : 'text-muted-foreground'}`}>
                          <CheckCircle className={`w-4 h-4 ${req.met ? 'text-green-500' : 'text-muted-foreground/50'}`} />
                          {req.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t.auth?.confirmPassword || 'Confirm Password'} *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                  {confirmPassword && config.adminPassword !== confirmPassword && (
                    <p className="text-sm text-destructive">{t.auth?.passwordMismatch || 'Passwords do not match'}</p>
                  )}
                </div>
              </div>

              <Button size="lg" className="w-full" disabled={!canProceedAdmin} onClick={() => setStep('site')}>
                {t.common?.next || 'Next'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* STEP: Site Settings (fresh only) */}
          {step === 'site' && (
            <div className="space-y-6">
              <div>
                <Button variant="ghost" size="sm" onClick={() => setStep('admin')} className="mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> {t.common?.back || 'Back'}
                </Button>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t.install?.siteSettings || 'Site Settings'}
                </h1>
                <p className="text-muted-foreground">
                  {t.install?.siteSettingsDesc || 'Customize your platform name and details. You can change these later.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.install?.siteName || 'Site Name'}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={config.siteName}
                      onChange={(e) => updateConfig('siteName', e.target.value)}
                      placeholder="ZNode"
                      className="pl-10 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.install?.siteSlogan || 'Site Slogan'}</Label>
                  <Input
                    value={config.siteSlogan}
                    onChange={(e) => updateConfig('siteSlogan', e.target.value)}
                    placeholder="Free Web Hosting"
                    className="h-12"
                  />
                </div>
              </div>

              {/* What will be installed */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t.install?.whatWillBeInstalled || 'What will be set up'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      t.install?.willCreateEnv || 'Environment configuration (.env)',
                      t.install?.willCreateDb || 'Database tables & schema',
                      t.install?.willCreateAdmin || 'Admin account',
                      t.install?.willSeedTemplates || 'Email templates (9 system templates)',
                      t.install?.willSeedSeo || 'SEO settings & meta tags',
                      t.install?.willSeedKb || 'Knowledge base categories',
                      t.install?.willSeedLanding || 'Default landing page',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Button size="lg" className="w-full" onClick={runInstall}>
                {t.install?.startInstall || 'Start Installation'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* STEP: Installing... */}
          {step === 'installing' && (
            <div className="space-y-8 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Settings className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t.install?.installingTitle || 'Installing ZNode...'}
                </h1>
                <p className="text-muted-foreground">{installStep}</p>
              </div>

              <div className="space-y-2">
                <Progress value={installProgress} className="h-3" />
                <p className="text-sm text-muted-foreground">{installProgress}%</p>
              </div>

              <p className="text-sm text-muted-foreground">
                {t.install?.doNotClose || 'Please do not close this page.'}
              </p>
            </div>
          )}

          {/* STEP: Restore - Upload (restore mode) */}
          {step === 'restore-upload' && (
            <div className="space-y-6">
              <div>
                <Button variant="ghost" size="sm" onClick={() => setStep('database')} className="mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> {t.common?.back || 'Back'}
                </Button>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t.install?.restoreBackup || 'Restore from Backup'}
                </h1>
                <p className="text-muted-foreground">
                  {t.install?.restoreBackupDesc || 'Upload a backup file to restore your data from another server.'}
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t.install?.restoreWarning || 'This will import all data from the backup file including users, settings, and content. After restore, login with credentials from the backup.'}
                </p>
              </div>

              {/* File upload zone */}
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.sql.gz,.sql"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-3">
                    <FileArchive className="w-12 h-12 mx-auto text-primary" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                      {t.setup?.changeFile || 'Change file'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">{t.setup?.clickToUpload || 'Click to select a backup file'}</p>
                    <p className="text-xs text-muted-foreground">{t.setup?.supportedFormats || '.zip, .sql.gz, .sql'}</p>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full" disabled={!selectedFile} onClick={runRestore}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t.install?.startRestore || 'Start Restore'}
              </Button>
            </div>
          )}

          {/* STEP: Restore Progress */}
          {step === 'restore-progress' && (
            <div className="space-y-8 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <RotateCcw className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t.install?.restoringData || 'Restoring Data...'}
                </h1>
                <p className="text-muted-foreground">
                  {t.install?.uploadingAndRestoring || 'Uploading and restoring your backup...'}
                </p>
              </div>

              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-3" />
                <p className="text-sm text-muted-foreground">{uploadStep || `${uploadProgress}%`}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                {t.install?.doNotClose || 'Please do not close this page.'}
              </p>
            </div>
          )}

          {/* STEP: Complete */}
          {step === 'complete' && (
            <div className="space-y-8 text-center">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {mode === 'fresh'
                    ? (t.install?.installComplete || 'Installation Complete!')
                    : (t.install?.restoreComplete || 'Restore Complete!')}
                </h1>
                <p className="text-muted-foreground">
                  {mode === 'fresh'
                    ? (t.install?.installCompleteDesc || 'Your platform is ready. Login with your admin credentials to get started.')
                    : (t.install?.restoreCompleteDesc || 'Your data has been restored. Login with your credentials from the backup.')}
                </p>
              </div>

              {mode === 'fresh' && (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 text-left">
                      <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t.install?.adminEmail || 'Admin Email'}</p>
                        <p className="font-medium font-mono">{config.adminEmail}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                <Button size="lg" className="w-full" onClick={() => navigate('/login', { replace: true })}>
                  {t.install?.goToLogin || 'Go to Login'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t.install?.restartNote || 'Note: You may need to restart the backend service for all changes to take effect.'}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
