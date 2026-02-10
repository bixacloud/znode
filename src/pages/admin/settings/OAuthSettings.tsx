import { useState, useEffect } from "react";
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import authService, { OAuthConfig, type OAuthSettings as OAuthSettingsType } from "@/services/auth";

// OAuth Provider Icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#F25022" d="M1 1h10v10H1z"/>
    <path fill="#00A4EF" d="M1 13h10v10H1z"/>
    <path fill="#7FBA00" d="M13 1h10v10H13z"/>
    <path fill="#FFB900" d="M13 13h10v10H13z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const providers = [
  { 
    id: 'google', 
    name: 'Google', 
    icon: GoogleIcon, 
    color: 'bg-white border',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    description: 'Đăng nhập bằng tài khoản Google'
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    icon: FacebookIcon, 
    color: 'bg-white border',
    docsUrl: 'https://developers.facebook.com/apps',
    description: 'Đăng nhập bằng tài khoản Facebook'
  },
  { 
    id: 'microsoft', 
    name: 'Microsoft', 
    icon: MicrosoftIcon, 
    color: 'bg-white border',
    docsUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps',
    description: 'Đăng nhập bằng tài khoản Microsoft'
  },
  { 
    id: 'discord', 
    name: 'Discord', 
    icon: DiscordIcon, 
    color: 'bg-white border',
    docsUrl: 'https://discord.com/developers/applications',
    description: 'Đăng nhập bằng tài khoản Discord'
  },
];

const OAuthSettingsPage = () => {
  const [settings, setSettings] = useState<OAuthSettingsType>({
    google: { enabled: false, clientId: '', clientSecret: '' },
    facebook: { enabled: false, clientId: '', clientSecret: '' },
    microsoft: { enabled: false, clientId: '', clientSecret: '' },
    discord: { enabled: false, clientId: '', clientSecret: '' },
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('google');
  
  const { toast } = useToast();

  const defaultSettings: OAuthSettingsType = {
    google: { enabled: false, clientId: '', clientSecret: '' },
    facebook: { enabled: false, clientId: '', clientSecret: '' },
    microsoft: { enabled: false, clientId: '', clientSecret: '' },
    discord: { enabled: false, clientId: '', clientSecret: '' },
  };

  const loadSettings = async () => {
    try {
      const response = await authService.getOAuthSettings();
      // Merge with defaults to handle missing providers
      setSettings({
        ...defaultSettings,
        ...response.settings,
        google: { ...defaultSettings.google, ...response.settings?.google },
        facebook: { ...defaultSettings.facebook, ...response.settings?.facebook },
        microsoft: { ...defaultSettings.microsoft, ...response.settings?.microsoft },
        discord: { ...defaultSettings.discord, ...response.settings?.discord },
      });
    } catch {
      toast({
        title: "Error",
        description: "Cannot load OAuth configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (provider: keyof OAuthSettingsType) => {
    setIsSaving(provider);
    try {
      await authService.updateOAuthProvider(provider, settings[provider]);
      toast({
        title: "Success",
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} configuration saved`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Cannot save configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  const handleTest = async (provider: string) => {
    try {
      const response = await authService.testOAuthProvider(provider);
      toast({
        title: response.success ? "Success" : "Error",
        description: response.message,
        variant: response.success ? "default" : "destructive",
      });
    } catch (error: unknown) {
      const err = error as { error?: string };
      toast({
        title: "Error",
        description: err.error || "Cannot test configuration",
        variant: "destructive",
      });
    }
  };

  const updateProviderConfig = (provider: keyof OAuthSettingsType, field: keyof OAuthConfig, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  const toggleSecret = (provider: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">OAuth Providers</h1>
          <p className="text-muted-foreground mt-1">Cấu hình đăng nhập bằng mạng xã hội</p>
        </div>
        
        {/* OAuth Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Cấu hình OAuth Providers
            </CardTitle>
            <CardDescription>
              Thiết lập các provider OAuth để cho phép người dùng đăng nhập bằng tài khoản mạng xã hội
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {providers.map((provider) => {
                  const Icon = provider.icon;
                  const config = settings[provider.id as keyof OAuthSettingsType];
                  return (
                    <TabsTrigger 
                      key={provider.id} 
                      value={provider.id}
                      className="flex items-center gap-2"
                    >
                    <Icon />
                    <span className="hidden sm:inline">{provider.name}</span>
                    {config.enabled && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {providers.map((provider) => {
              const Icon = provider.icon;
              const config = settings[provider.id as keyof OAuthSettingsType];
              return (
                <TabsContent key={provider.id} value={provider.id} className="space-y-6">
                  {/* Provider Info */}
                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className={`w-12 h-12 rounded-xl ${provider.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{provider.name} OAuth</h3>
                      <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
                      <a 
                        href={provider.docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Mở Developer Console
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${provider.id}-enabled`} className="text-sm">
                        {config.enabled ? 'Đang bật' : 'Đang tắt'}
                      </Label>
                      <Switch
                        id={`${provider.id}-enabled`}
                        checked={config.enabled}
                        onCheckedChange={(checked) => updateProviderConfig(provider.id as keyof OAuthSettingsType, 'enabled', checked)}
                      />
                    </div>
                  </div>

                  {/* Configuration Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-clientId`}>
                        Client ID {provider.id === 'facebook' ? '(App ID)' : ''}
                      </Label>
                      <Input
                        id={`${provider.id}-clientId`}
                        value={config.clientId}
                        onChange={(e) => updateProviderConfig(provider.id as keyof OAuthSettingsType, 'clientId', e.target.value)}
                        placeholder={`Nhập ${provider.name} Client ID`}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-clientSecret`}>
                        Client Secret {provider.id === 'facebook' ? '(App Secret)' : ''}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${provider.id}-clientSecret`}
                          type={showSecrets[provider.id] ? "text" : "password"}
                          value={config.clientSecret}
                          onChange={(e) => updateProviderConfig(provider.id as keyof OAuthSettingsType, 'clientSecret', e.target.value)}
                          placeholder={`Nhập ${provider.name} Client Secret`}
                          className="font-mono pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret(provider.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.id}-callbackUrl`}>
                        Callback URL
                        <span className="text-muted-foreground font-normal ml-2">(Copy vào Developer Console)</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`${provider.id}-callbackUrl`}
                          value={`${window.location.origin.replace(/:\d+$/, ':3002')}/api/auth/${provider.id}/callback`}
                          readOnly
                          className="font-mono bg-muted"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin.replace(/:\d+$/, ':3002')}/api/auth/${provider.id}/callback`);
                            toast({
                              title: "Đã copy",
                              description: "Callback URL đã được copy vào clipboard",
                            });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-blue-700 dark:text-blue-300">
                        <p className="font-medium">Hướng dẫn:</p>
                        <ol className="list-decimal list-inside mt-1 space-y-1 text-blue-600 dark:text-blue-400">
                          <li>Truy cập Developer Console của {provider.name}</li>
                          <li>Tạo ứng dụng mới hoặc chọn ứng dụng hiện có</li>
                          <li>Copy Client ID và Client Secret</li>
                          <li>Thêm Callback URL vào danh sách Redirect URIs</li>
                          <li>Bật OAuth và nhấn Lưu</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleSave(provider.id as keyof OAuthSettingsType)}
                      disabled={isSaving === provider.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving === provider.id ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Lưu cấu hình
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleTest(provider.id)}
                      disabled={!config.enabled || !config.clientId}
                    >
                      Kiểm tra kết nối
                    </Button>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái OAuth Providers</CardTitle>
          <CardDescription>
            Tổng quan về các provider đã cấu hình
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {providers.map((provider) => {
              const Icon = provider.icon;
              const config = settings[provider.id as keyof OAuthSettingsType];
              const isConfigured = config.enabled && config.clientId && config.clientSecret;
              return (
                <div 
                  key={provider.id}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    isConfigured 
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' 
                      : 'border-border bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center`}>
                      <Icon />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{provider.name}</p>
                      <div className="flex items-center gap-1 text-sm">
                        {isConfigured ? (
                          <>
                            <Check className="w-3 h-3 text-green-600" />
                            <span className="text-green-600">Đã cấu hình</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 text-gray-400" />
                            <span className="text-muted-foreground">Chưa cấu hình</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
};

export default OAuthSettingsPage;
