import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  Key, 
  Save, 
  TestTube,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface SSLConfig {
  CLOUDFLARE_API_TOKEN?: string;
  INTERMEDIATE_DOMAIN?: string;
  ACME_EMAIL?: string;
  USE_STAGING?: string;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  GOOGLE_EAB_KEY_ID?: string;
  GOOGLE_EAB_HMAC_KEY?: string;
}

interface AllowedDomain {
  domain: string;
  enabled: boolean;
}

export default function AdminSSLSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.sslSettings || 'SSL Settings');
  const token = authService.getAccessToken();

  // Config state
  const [config, setConfig] = useState<SSLConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Allowed domains (for service domains display)
  const [allowedDomains, setAllowedDomains] = useState<AllowedDomain[]>([]);

  // Fetch SSL config
  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ssl/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch SSL config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch allowed domains
  const fetchAllowedDomains = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/domains`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllowedDomains(data.domains || []);
      }
    } catch (error) {
      console.error('Failed to fetch allowed domains:', error);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchAllowedDomains();
  }, []);

  // Save config
  const saveConfig = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/ssl/admin/config/bulk`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      
      if (response.ok) {
        toast({
          title: t.common?.success || 'Success',
          description: t.ssl?.configSaved || 'SSL configuration saved successfully',
        });
        fetchConfig();
      } else {
        throw new Error('Failed to save config');
      }
    } catch (error) {
      toast({
        title: t.common?.error || 'Error',
        description: t.ssl?.configSaveFailed || 'Failed to save SSL configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test Cloudflare connection
  const testCloudflare = async () => {
    try {
      setTesting(true);
      const response = await fetch(`${API_URL}/api/ssl/admin/test-cloudflare`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: t.common?.success || 'Success',
          description: t.ssl?.cloudflareConnected || 'Cloudflare connection successful',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: t.common?.error || 'Error',
        description: error.message || t.ssl?.cloudflareFailed || 'Cloudflare connection failed',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  // Test Google Service Account connection
  const testGoogle = async () => {
    try {
      setTestingGoogle(true);
      setGoogleTestResult(null);
      
      // First save config to ensure backend has latest Service Account JSON
      await saveConfig();
      
      const response = await fetch(`${API_URL}/api/ssl/admin/test-google`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGoogleTestResult({
          success: true,
          message: `Connected as: ${data.email}\nProject: ${data.projectId}`
        });
        toast({
          title: t.common?.success || 'Success',
          description: 'Google Service Account connected successfully',
        });
      } else {
        setGoogleTestResult({
          success: false,
          message: data.error || 'Connection failed'
        });
        throw new Error(data.error);
      }
    } catch (error: any) {
      setGoogleTestResult({
        success: false,
        message: error.message || 'Connection failed'
      });
      toast({
        title: t.common?.error || 'Error',
        description: error.message || 'Google Service Account connection failed',
        variant: 'destructive',
      });
    } finally {
      setTestingGoogle(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.ssl?.configuration || 'SSL Configuration'}</h1>
          <p className="text-muted-foreground">{t.ssl?.configurationDesc || 'Configure SSL providers and settings'}</p>
        </div>

        <div className="space-y-4">
          {/* Cloudflare Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {t.ssl?.cloudflareConfig || 'Cloudflare Configuration'}
              </CardTitle>
              <CardDescription>
                {t.ssl?.cloudflareConfigDesc || 'Configure Cloudflare API for DNS-01 challenges on subdomain SSL'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cf-api-token">{t.ssl?.apiToken || 'API Token'}</Label>
                  <Input
                    id="cf-api-token"
                    type="password"
                    placeholder="••••••••"
                    value={config.CLOUDFLARE_API_TOKEN || ''}
                    onChange={(e) => setConfig({ ...config, CLOUDFLARE_API_TOKEN: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.ssl?.apiTokenDesc || 'Create a token with Zone:DNS:Edit permission in Cloudflare Dashboard'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intermediate-domain">{t.ssl?.intermediateDomain || 'Intermediate Domain'}</Label>
                  <Input
                    id="intermediate-domain"
                    placeholder="acme.yourdomain.com"
                    value={config.INTERMEDIATE_DOMAIN || ''}
                    onChange={(e) => setConfig({ ...config, INTERMEDIATE_DOMAIN: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.ssl?.intermediateDomainDesc || 'Domain used for CNAME delegation in DNS-01 challenges'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={testCloudflare} disabled={testing}>
                  {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                  {t.ssl?.testConnection || 'Test Connection'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Domain Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t.ssl?.domainSettings || 'Domain Settings'}</CardTitle>
              <CardDescription>
                {t.ssl?.domainSettingsDesc || 'Configure service domains and ACME settings'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.ssl?.serviceDomains || 'Service Domains'}</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md min-h-[40px]">
                  {allowedDomains.filter(d => d.enabled).length > 0 ? (
                    allowedDomains.filter(d => d.enabled).map((d, idx) => (
                      <Badge key={idx} variant="secondary">{d.domain}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t.ssl?.noServiceDomains || 'No domains configured. Add domains in Settings > Allowed Domains.'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.ssl?.serviceDomainsFromAllowed || 'Service domains are automatically loaded from Allowed Domains settings'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="acme-email">{t.ssl?.acmeEmail || 'ACME Account Email'}</Label>
                <Input
                  id="acme-email"
                  type="email"
                  placeholder="ssl@yourdomain.com"
                  value={config.ACME_EMAIL || ''}
                  onChange={(e) => setConfig({ ...config, ACME_EMAIL: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t.ssl?.acmeEmailDesc || 'Email for ACME account registration and certificate expiry notifications'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-staging"
                  checked={config.USE_STAGING === 'true'}
                  onCheckedChange={(checked) => setConfig({ ...config, USE_STAGING: checked ? 'true' : 'false' })}
                />
                <Label htmlFor="use-staging">{t.ssl?.useStaging || 'Use Staging Environment'}</Label>
                <p className="text-xs text-muted-foreground ml-2">
                  {t.ssl?.useStagingDesc || '(for testing, does not issue real certificates)'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Google Trust Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {t.ssl?.googleConfig || 'Google Trust Services'}
              </CardTitle>
              <CardDescription>
                {t.ssl?.googleConfigDesc || 'Configure Google Cloud Service Account for automatic EAB key generation. This is the recommended method.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.ssl?.googleSetupTitle || 'Setup Instructions'}</AlertTitle>
                <AlertDescription className="text-sm space-y-2">
                  <p>1. Go to Google Cloud Console → IAM & Admin → Service Accounts</p>
                  <p>2. Create a Service Account with role: "Public CA External Account Key Creator"</p>
                  <p>3. Create a JSON key and paste the content below</p>
                  <p>4. Enable "Public Certificate Authority API" in your project</p>
                </AlertDescription>
              </Alert>
              
              {/* Service Account JSON - Recommended */}
              <div className="space-y-2">
                <Label htmlFor="google-sa-json">{t.ssl?.serviceAccountJson || 'Service Account JSON (Recommended)'}</Label>
                <textarea
                  id="google-sa-json"
                  className="w-full h-32 p-3 text-xs font-mono border rounded-md bg-background resize-none"
                  placeholder='{"type": "service_account", "project_id": "...", ...}'
                  value={config.GOOGLE_SERVICE_ACCOUNT_JSON || ''}
                  onChange={(e) => setConfig({ ...config, GOOGLE_SERVICE_ACCOUNT_JSON: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t.ssl?.serviceAccountJsonDesc || 'Paste the entire JSON content from your Service Account key file. EAB keys will be generated automatically.'}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={testGoogle} disabled={testingGoogle}>
                  {testingGoogle ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                  {t.ssl?.testServiceAccount || 'Test Service Account'}
                </Button>
                {googleTestResult && (
                  <span className={`text-sm flex items-center gap-1 ${googleTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {googleTestResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {googleTestResult.message}
                  </span>
                )}
              </div>
              
              {/* Manual EAB - Fallback */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-3">{t.ssl?.manualEab || 'Manual EAB (Alternative)'}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {t.ssl?.manualEabDesc || 'If you prefer to manually generate EAB keys using gcloud CLI, enter them here. Note: Each key can only be used once.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="google-eab-key-id">{t.ssl?.eabKeyId || 'EAB Key ID'}</Label>
                    <Input
                      id="google-eab-key-id"
                      placeholder="a1b2c3d4..."
                      value={config.GOOGLE_EAB_KEY_ID || ''}
                      onChange={(e) => setConfig({ ...config, GOOGLE_EAB_KEY_ID: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google-eab-hmac">{t.ssl?.eabHmacKey || 'EAB HMAC Key'}</Label>
                    <Input
                      id="google-eab-hmac"
                      type="password"
                      placeholder="••••••••"
                      value={config.GOOGLE_EAB_HMAC_KEY || ''}
                      onChange={(e) => setConfig({ ...config, GOOGLE_EAB_HMAC_KEY: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t.common?.save || 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
