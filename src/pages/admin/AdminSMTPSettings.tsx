import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  Mail, 
  RefreshCw,
  Save,
  TestTube
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export default function AdminSMTPSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.smtpSettings || 'SMTP Settings');
  const token = authService.getAccessToken();

  // SMTP State
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    from: '',
    fromName: ''
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load SMTP config on mount
  useEffect(() => {
    fetchSmtpConfig();
  }, []);

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/email/smtp`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSmtpConfig({
          host: data.smtp_host || '',
          port: data.smtp_port || '587',
          secure: data.smtp_secure === 'true',
          user: data.smtp_user || '',
          pass: data.smtp_pass || '',
          from: data.smtp_from || '',
          fromName: data.smtp_from_name || ''
        });
      }
    } catch (error) {
      console.error('Fetch SMTP error:', error);
    }
  };

  const handleSaveSmtp = async () => {
    setSmtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/email/smtp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(smtpConfig)
      });

      if (res.ok) {
        toast({ title: t.common?.success || "Success", description: t.admin?.smtpSaved || "SMTP settings saved" });
      } else {
        const data = await res.json();
        toast({ title: t.common?.error || "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: t.common?.error || "Error", description: t.admin?.smtpSaveFailed || "Failed to save SMTP settings", variant: "destructive" });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    try {
      const res = await fetch(`${API_URL}/api/email/smtp/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...smtpConfig, testEmail })
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: t.common?.success || "Success", description: data.message || t.admin?.smtpTestSuccess || "SMTP test successful" });
      } else {
        toast({ title: t.common?.error || "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: t.common?.error || "Error", description: t.admin?.smtpTestFailed || "Failed to test SMTP", variant: "destructive" });
    } finally {
      setSmtpTesting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t.admin?.smtpSettings || "SMTP Settings"}</h1>
          <p className="text-muted-foreground">{t.admin?.smtpSettingsDescription || "Configure your SMTP server for sending emails"}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t.admin?.smtpConfiguration || "SMTP Configuration"}
            </CardTitle>
            <CardDescription>{t.admin?.smtpConfigurationDescription || "Configure your SMTP server for sending emails"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.admin?.smtpHost || "SMTP Host"}</Label>
                <Input 
                  value={smtpConfig.host}
                  onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin?.smtpPort || "SMTP Port"}</Label>
                <Input 
                  value={smtpConfig.port}
                  onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                  placeholder="587"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin?.smtpUsername || "Username"}</Label>
                <Input 
                  value={smtpConfig.user}
                  onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin?.smtpPassword || "Password"}</Label>
                <Input 
                  type="password"
                  value={smtpConfig.pass}
                  onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin?.smtpFromEmail || "From Email"}</Label>
                <Input 
                  value={smtpConfig.from}
                  onChange={e => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                  placeholder="noreply@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin?.smtpFromName || "From Name"}</Label>
                <Input 
                  value={smtpConfig.fromName}
                  onChange={e => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                  placeholder="My Company"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                id="secure"
                checked={smtpConfig.secure}
                onCheckedChange={checked => setSmtpConfig({ ...smtpConfig, secure: checked })}
              />
              <Label htmlFor="secure">{t.admin?.smtpUseSsl || "Use SSL/TLS (port 465)"}</Label>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t">
              <Button onClick={handleSaveSmtp} disabled={smtpLoading}>
                {smtpLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t.common?.save || "Save Settings"}
              </Button>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="w-48"
                />
                <Button variant="outline" onClick={handleTestSmtp} disabled={smtpTesting}>
                  {smtpTesting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                  {t.admin?.smtpTest || "Test"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
