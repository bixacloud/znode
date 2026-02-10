import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Server,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Copy,
  Globe,
  Network,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AdminLayout from "@/components/admin/AdminLayout";

interface MOFHConfig {
  enabled: boolean;
  apiUsername: string;
  apiPassword: string;
  defaultPackage: string;
  callbackUrl: string;
  cpanelUrl: string;
  serverIp: string;
  customNameservers?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const MOFHSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [serverIp, setServerIp] = useState<string>("");
  const [loadingIp, setLoadingIp] = useState(true);
  const [config, setConfig] = useState<MOFHConfig>({
    enabled: false,
    apiUsername: "",
    apiPassword: "",
    defaultPackage: "",
    callbackUrl: "",
    cpanelUrl: "",
    serverIp: "",
    customNameservers: "",
  });

  // Fetch current MOFH settings
  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ["mofh-settings"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/mofh`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch MOFH settings");
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch server public IP from backend
  useEffect(() => {
    const fetchServerIp = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch(`${API_URL}/api/settings/server-ip`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setServerIp(data.ip);
        } else {
          setServerIp('Không thể lấy IP');
        }
      } catch (error) {
        console.error('Failed to fetch server IP:', error);
        setServerIp('Không thể lấy IP');
      } finally {
        setLoadingIp(false);
      }
    };
    fetchServerIp();
  }, []);


  // Update settings from API
  useEffect(() => {
    if (settingsData?.settings) {
      setConfig(settingsData.settings);
    }
  }, [settingsData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: MOFHConfig) => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/mofh`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mofh-settings"] });
      queryClient.invalidateQueries({ queryKey: ["mofh-packages"] });
      toast({
        title: "Saved successfully",
        description: "MOFH API settings have been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/settings/mofh/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiUsername: config.apiUsername,
          apiPassword: config.apiPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.error || "Connection failed",
          apiVersion: data.apiVersion,
        };
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Connection successful",
          description: data.message || "MOFH API connected successfully",
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.message || "Cannot connect to MOFH API",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Cannot connect to server",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleTest = () => {
    testMutation.mutate();
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hosting API (MOFH)</h1>
        <p className="text-muted-foreground">
          Cấu hình MyOwnFreeHost API để quản lý hosting miễn phí
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Lưu ý quan trọng</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            MOFH API cho phép bạn tạo và quản lý tài khoản hosting miễn phí.
            Mỗi người dùng chỉ được phép tạo tối đa 3 tài khoản.
          </p>
          <p>
            Để lấy API credentials, truy cập:{" "}
            <a
              href="https://panel.myownfreehost.net/panel/index2.php?option=api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              MOFH Panel → API Settings
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </AlertDescription>
      </Alert>

      {/* Main Settings - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - API Credentials */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>API Credentials</CardTitle>
                  <CardDescription>
                    Thông tin đăng nhập MOFH API
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="mofh-enabled">Kích hoạt</Label>
                <Switch
                  id="mofh-enabled"
                  checked={config.enabled}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, enabled: checked })
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Username */}
            <div className="space-y-2">
              <Label htmlFor="api-username">API Username</Label>
              <Input
                id="api-username"
                placeholder="Nhập API Username từ MOFH Panel"
                value={config.apiUsername}
                onChange={(e) =>
                  setConfig({ ...config, apiUsername: e.target.value })
                }
              />
            </div>

            {/* API Password */}
            <div className="space-y-2">
              <Label htmlFor="api-password">API Password</Label>
              <div className="relative">
                <Input
                  id="api-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập API Password từ MOFH Panel"
                  value={config.apiPassword}
                  onChange={(e) =>
                    setConfig({ ...config, apiPassword: e.target.value })
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Default Package */}
            <div className="space-y-2">
              <Label htmlFor="default-package">Gói mặc định</Label>
              <Input
                id="default-package"
                placeholder="Nhập tên gói (ví dụ: Default)"
                value={config.defaultPackage}
                onChange={(e) =>
                  setConfig({ ...config, defaultPackage: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Tên gói hosting từ MOFH Panel
              </p>
            </div>

            {/* cPanel URL */}
            <div className="space-y-2">
              <Label htmlFor="cpanel-url" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                cPanel URL
              </Label>
              <Input
                id="cpanel-url"
                placeholder="cpanel.yourdomain.com"
                value={config.cpanelUrl}
                onChange={(e) =>
                  setConfig({ ...config, cpanelUrl: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                URL cPanel hiển thị cho người dùng
              </p>
            </div>

            {/* Custom Nameservers */}
            <div className="space-y-2">
              <Label htmlFor="custom-nameservers" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                Custom Nameservers
              </Label>
              <Input
                id="custom-nameservers"
                placeholder="ns1.example.com, ns2.example.com"
                value={config.customNameservers || ""}
                onChange={(e) =>
                  setConfig({ ...config, customNameservers: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Nameservers cho custom domain (phân cách bằng dấu phẩy). Để trống sẽ dùng ns1-ns5.byet.org
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                onClick={handleTest}
                variant="outline"
                size="sm"
                disabled={!config.apiUsername || !config.apiPassword || testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Lưu cài đặt
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Server Info & Packages */}
        <div className="space-y-6">
          {/* Server Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Thông tin Server
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Callback URL */}
              <div className="space-y-2">
                <Label htmlFor="callback-url">Callback URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="callback-url"
                    value={`${window.location.origin}/api/mofh/callback`}
                    readOnly
                    className="bg-muted text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/mofh/callback`);
                      toast({
                        title: "Đã sao chép",
                        description: "Callback URL đã được sao chép",
                      });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dán vào MOFH Panel → API Settings
                </p>
              </div>

              {/* Server Public IP */}
              <div className="space-y-2">
                <Label htmlFor="server-ip">Server IP</Label>
                <div className="flex gap-2">
                  <Input
                    id="server-ip"
                    value={loadingIp ? "Loading..." : serverIp}
                    readOnly
                    className="bg-muted font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={loadingIp || !serverIp}
                    onClick={() => {
                      navigator.clipboard.writeText(serverIp);
                      toast({
                        title: "Đã sao chép",
                        description: "Server IP đã được sao chép",
                      });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Thêm IP này vào whitelist MOFH
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
};

export default MOFHSettings;
