import { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Upload,
  FileUp,
  Users,
  HardDrive,
  Ticket,
  Shield,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Database,
  Eye,
  EyeOff,
  Info,
  ArrowRight,
  TriangleAlert,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Preview {
  users: number;
  admins: number;
  adminConflicts: number;
  adminConflictEmails: string[];
  accounts: number;
  tickets: number;
  replies: number;
  ssl: number;
  settings: {
    hasMofh: boolean;
    hasSmtp: boolean;
    domainsCount: number;
    domains: string[];
  };
}

interface SampleUser {
  email: string;
  name: string;
}

interface SampleAccount {
  username: string;
  domain: string;
  status: string;
}

interface ImportResults {
  usersImported: number;
  usersSkipped: number;
  adminsImported: number;
  adminsSkipped: number;
  accountsImported: number;
  accountsSkipped: number;
  ticketsImported: number;
  repliesImported: number;
  sslImported: number;
  settingsImported: string[];
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
}

const AdminDataImport = () => {
  const { t } = useLanguage();
  const { toast } = useToast();

  // State
  const [step, setStep] = useState<'upload' | 'preview' | 'configure' | 'importing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sampleUsers, setSampleUsers] = useState<SampleUser[]>([]);
  const [sampleAccounts, setSampleAccounts] = useState<SampleAccount[]>([]);
  const [passwordMode, setPasswordMode] = useState<'uniform' | 'random'>('random');
  const [uniformPassword, setUniformPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [importSettings, setImportSettings] = useState(true);
  const [sendEmails, setSendEmails] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const di = t.admin?.dataImport || {} as Record<string, any>;

  // Upload & parse SQL
  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('sqlFile', file);

      const res = await fetch(`${API_URL}/api/admin/import/parse`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setPreview(data.preview);
      setSampleUsers(data.sampleUsers || []);
      setSampleAccounts(data.sampleAccounts || []);
      setStep('preview');
    } catch (err: any) {
      toast({
        title: t.common?.error || 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [file, toast, t]);

  // Execute import
  const handleImport = useCallback(async () => {
    if (passwordMode === 'uniform' && !uniformPassword) {
      toast({
        title: t.common?.error || 'Error',
        description: di.passwordRequired || 'Please enter a password',
        variant: 'destructive',
      });
      return;
    }

    setConfirmDialog(false);
    setImporting(true);
    setStep('importing');
    setImportProgress(10);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + Math.random() * 15, 90));
    }, 1000);

    try {
      const res = await fetch(`${API_URL}/api/admin/import/execute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          passwordMode,
          uniformPassword: passwordMode === 'uniform' ? uniformPassword : undefined,
          importSettings,
          sendEmails,
        }),
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const data = await res.json();
      setResults(data.results);
      setStep('done');
    } catch (err: any) {
      clearInterval(progressInterval);
      setImportProgress(0);
      setStep('configure');
      toast({
        title: t.common?.error || 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  }, [sessionId, passwordMode, uniformPassword, importSettings, sendEmails, toast, t, di]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.name.endsWith('.sql')) {
      setFile(dropped);
    }
  }, []);

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setSessionId('');
    setPreview(null);
    setSampleUsers([]);
    setSampleAccounts([]);
    setPasswordMode('random');
    setUniformPassword('');
    setImportSettings(true);
    setSendEmails(true);
    setResults(null);
    setImportProgress(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{di.title || 'Data Import'}</h1>
          <p className="text-muted-foreground mt-1">
            {di.subtitle || 'Import data from old Bixa PHP system to ZNode'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {['upload', 'preview', 'configure', 'importing', 'done'].map((s, i) => {
            const labels = [
              di.stepUpload || 'Upload',
              di.stepPreview || 'Preview',
              di.stepConfigure || 'Configure',
              di.stepImporting || 'Importing',
              di.stepDone || 'Done',
            ];
            const stepIndex = ['upload', 'preview', 'configure', 'importing', 'done'].indexOf(step);
            const isActive = s === step;
            const isDone = i < stepIndex;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                <Badge variant={isActive ? 'default' : isDone ? 'secondary' : 'outline'}>
                  {isDone ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}
                  {labels[i]}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                {di.uploadTitle || 'Upload SQL File'}
              </CardTitle>
              <CardDescription>
                {di.uploadDesc || 'Upload the SQL dump file from your old Bixa PHP system (bixa.sql)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertTitle>{di.importNote || 'Important'}</AlertTitle>
                <AlertDescription>
                  {di.importNoteDesc || 'This will import users, hosting accounts, tickets, SSL certificates and settings from the old system. Builder and base settings will be skipped.'}
                </AlertDescription>
              </Alert>

              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('sql-file-input')?.click()}
              >
                <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {file ? file.name : di.dropZone || 'Click or drag SQL file here'}
                </p>
                {file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                <input
                  id="sql-file-input"
                  type="file"
                  accept=".sql"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {di.parsing || 'Parsing...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {di.uploadAndParse || 'Upload & Parse'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {di.previewTitle || 'Data Preview'}
                </CardTitle>
                <CardDescription>
                  {di.previewDesc || 'Review the data found in the SQL file before importing'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Users} label={di.users || 'Users'} value={preview.users} />
                  <StatCard icon={Shield} label={di.adminsLabel || 'Admins'} value={preview.admins} />
                  <StatCard icon={HardDrive} label={di.hostings || 'Hostings'} value={preview.accounts} />
                  <StatCard icon={Ticket} label={di.tickets || 'Tickets'} value={preview.tickets} />
                  <StatCard icon={Mail} label={di.replies || 'Replies'} value={preview.replies} />
                  <StatCard icon={Shield} label={di.sslCerts || 'SSL Certs'} value={preview.ssl} />
                  <StatCard
                    icon={Settings}
                    label={di.settingsLabel || 'Settings'}
                    value={
                      (preview.settings.hasMofh ? 1 : 0) +
                      (preview.settings.hasSmtp ? 1 : 0) +
                      (preview.settings.domainsCount > 0 ? 1 : 0)
                    }
                    suffix={`/ 3`}
                  />
                </div>

                {preview.adminConflicts > 0 && (
                  <Alert className="mt-4" variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>{di.adminConflict || 'Admin Conflict'}</AlertTitle>
                    <AlertDescription>
                      {di.adminConflictDesc?.replace('{emails}', preview.adminConflictEmails.join(', ')) ||
                        `Admin emails that match current admin will be skipped: ${preview.adminConflictEmails.join(', ')}`}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sample data */}
                {sampleUsers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">{di.sampleUsers || 'Sample Users'}</h4>
                    <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                      {sampleUsers.map((u, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="text-muted-foreground w-8">{i + 1}.</span>
                          <span className="font-medium">{u.name}</span>
                          <span className="text-muted-foreground">{u.email}</span>
                        </div>
                      ))}
                      {preview.users > 10 && (
                        <p className="text-muted-foreground pl-8">
                          ...{di.andMore?.replace('{count}', String(preview.users - 10)) || `and ${preview.users - 10} more`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {preview.settings.domains.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">{di.domainsFound || 'Domains Found'}</h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.settings.domains.map((d, i) => (
                        <Badge key={i} variant="secondary">{d}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetAll}>
                {di.back || 'Back'}
              </Button>
              <Button onClick={() => setStep('configure')}>
                {di.continue || 'Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 'configure' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {di.configureTitle || 'Import Configuration'}
                </CardTitle>
                <CardDescription>
                  {di.configureDesc || 'Configure how data should be imported'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password mode */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    {di.passwordMode || 'Password Mode'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {di.passwordModeDesc || 'Old passwords cannot be reused. Choose how to set new passwords for imported users.'}
                  </p>
                  <RadioGroup
                    value={passwordMode}
                    onValueChange={(v) => setPasswordMode(v as 'uniform' | 'random')}
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="random" id="pw-random" className="mt-0.5" />
                      <div>
                        <Label htmlFor="pw-random" className="font-medium cursor-pointer">
                          {di.randomPassword || 'Random Password'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {di.randomPasswordDesc || 'Generate a unique random password for each user'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="uniform" id="pw-uniform" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="pw-uniform" className="font-medium cursor-pointer">
                          {di.uniformPassword || 'Uniform Password'}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {di.uniformPasswordDesc || 'Set the same password for all imported users'}
                        </p>
                        {passwordMode === 'uniform' && (
                          <div className="mt-2 relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              value={uniformPassword}
                              onChange={(e) => setUniformPassword(e.target.value)}
                              placeholder={di.enterPassword || 'Enter password'}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Import settings toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="font-medium">
                      {di.importSettingsLabel || 'Import Settings'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {di.importSettingsDesc || 'Import MOFH, SMTP, and domain settings from old system'}
                    </p>
                  </div>
                  <Switch checked={importSettings} onCheckedChange={setImportSettings} />
                </div>

                {/* Send emails toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label className="font-medium">
                      {di.sendEmailsLabel || 'Send Credential Emails'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {di.sendEmailsDesc || 'Send each user an email with their new login credentials'}
                    </p>
                  </div>
                  <Switch checked={sendEmails} onCheckedChange={setSendEmails} />
                </div>

                {!sendEmails && (
                  <Alert>
                    <TriangleAlert className="w-4 h-4" />
                    <AlertDescription>
                      {di.noEmailWarning || 'Users will not receive their new passwords. You will need to notify them manually or use the password reset feature.'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('preview')}>
                {di.back || 'Back'}
              </Button>
              <Button onClick={() => setConfirmDialog(true)}>
                {di.startImport || 'Start Import'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Confirm dialog */}
            <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{di.confirmTitle || 'Confirm Import'}</DialogTitle>
                  <DialogDescription>
                    {di.confirmDesc || 'This action will import all data from the old system. This cannot be undone. Are you sure?'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <p>• {preview?.users || 0} {di.users || 'users'} + {preview?.admins || 0} {di.adminsLabel || 'admins'}</p>
                  <p>• {preview?.accounts || 0} {di.hostings || 'hosting accounts'}</p>
                  <p>• {preview?.tickets || 0} {di.tickets || 'tickets'} + {preview?.replies || 0} {di.replies || 'replies'}</p>
                  <p>• {preview?.ssl || 0} {di.sslCerts || 'SSL certificates'}</p>
                  {importSettings && <p>• {di.settingsWillImport || 'Settings will be imported'}</p>}
                  {sendEmails && <p>• {di.emailsWillSend || 'Credential emails will be sent'}</p>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmDialog(false)}>
                    {t.common?.cancel || 'Cancel'}
                  </Button>
                  <Button onClick={handleImport}>
                    {di.confirmImport || 'Yes, Import Now'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {di.importingTitle || 'Importing Data...'}
              </CardTitle>
              <CardDescription>
                {di.importingDesc || 'Please wait while data is being imported. Do not close this page.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={importProgress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {Math.round(importProgress)}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Done */}
        {step === 'done' && results && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  {di.doneTitle || 'Import Completed'}
                </CardTitle>
                <CardDescription>
                  {di.doneDesc || 'Data has been successfully imported from the old system'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ResultCard
                    label={di.usersImported || 'Users Imported'}
                    value={results.usersImported}
                    skipped={results.usersSkipped}
                  />
                  <ResultCard
                    label={di.adminsImported || 'Admins Imported'}
                    value={results.adminsImported}
                    skipped={results.adminsSkipped}
                  />
                  <ResultCard
                    label={di.hostingsImported || 'Hostings Imported'}
                    value={results.accountsImported}
                    skipped={results.accountsSkipped}
                  />
                  <ResultCard
                    label={di.ticketsImported || 'Tickets Imported'}
                    value={results.ticketsImported}
                  />
                  <ResultCard
                    label={di.repliesImported || 'Replies Imported'}
                    value={results.repliesImported}
                  />
                  <ResultCard
                    label={di.sslImported || 'SSL Imported'}
                    value={results.sslImported}
                  />
                </div>

                {results.settingsImported.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">{di.settingsImportedLabel || 'Settings Imported'}</h4>
                    <div className="flex flex-wrap gap-2">
                      {results.settingsImported.map((s, i) => (
                        <Badge key={i} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {sendEmails && (
                  <div className="mt-4 p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">
                        {di.emailResults || 'Email Results'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {di.emailsSentCount?.replace('{sent}', String(results.emailsSent)).replace('{failed}', String(results.emailsFailed)) ||
                        `${results.emailsSent} sent, ${results.emailsFailed} failed`}
                    </p>
                  </div>
                )}

                {results.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {di.errorsLabel || 'Errors'}
                    </h4>
                    <div className="bg-destructive/10 rounded-lg p-3 text-sm space-y-1 max-h-40 overflow-y-auto">
                      {results.errors.map((e, i) => (
                        <p key={i} className="text-destructive">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={resetAll} variant="outline">
                {di.importAnother || 'Import Another'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Stat card component
const StatCard = ({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
}) => (
  <div className="p-4 rounded-lg border bg-card">
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-2xl font-bold">
      {value}
      {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
    </p>
  </div>
);

// Result card
const ResultCard = ({
  label,
  value,
  skipped,
}: {
  label: string;
  value: number;
  skipped?: number;
}) => (
  <div className="p-3 rounded-lg border bg-card">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-xl font-bold text-green-600">{value}</p>
    {skipped !== undefined && skipped > 0 && (
      <p className="text-xs text-muted-foreground">{skipped} skipped</p>
    )}
  </div>
);

export default AdminDataImport;
