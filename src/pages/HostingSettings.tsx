import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Trash2,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useTurnstileConfig, isTurnstileRequired } from "@/hooks/useTurnstile";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface Hosting {
  id: string;
  vpUsername: string;
  domain: string;
  label: string | null;
  status: string;
}

const HostingSettings = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  usePageTitle(t.hosting?.settings || 'Hosting Settings');
  
  // Turnstile
  const { data: turnstileConfig } = useTurnstileConfig();
  const requiresTurnstile = isTurnstileRequired(turnstileConfig, 'hostingSettings');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0); // For resetting widget
  
  const [label, setLabel] = useState("");
  const [isUpdatingLabel, setIsUpdatingLabel] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch hosting details
  const { data, isLoading } = useQuery({
    queryKey: ["hosting-settings", username],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch hosting details");
      }
      return response.json();
    },
  });

  const hosting: Hosting | undefined = data?.hosting;

  // Set initial label when data loads
  useEffect(() => {
    if (hosting?.label) {
      setLabel(hosting.label);
    }
  }, [hosting?.label]);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileKey(prev => prev + 1);
  }, []);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check turnstile
    if (requiresTurnstile && !turnstileToken) {
      toast({
        title: t.messages.error,
        description: t.hostingSettings?.captchaRequired || "Please complete the captcha verification",
        variant: "destructive",
      });
      return;
    }
    
    // Validate passwords
    if (newPassword.length < 8) {
      toast({
        title: t.messages.error,
        description: t.hostingSettings?.passwordMinLength || "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length > 20) {
      toast({
        title: t.messages.error,
        description: t.hostingSettings?.passwordMaxLength || "Password must not exceed 20 characters",
        variant: "destructive",
      });
      return;
    }
    
    // Only alphanumeric allowed (MOFH restriction)
    const passwordRegex = /^[a-zA-Z0-9]+$/;
    if (!passwordRegex.test(newPassword)) {
      toast({
        title: t.messages.error,
        description: t.hostingSettings?.passwordInvalidChars || "Password can only contain letters and numbers",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: t.messages.error,
        description: t.hostingSettings?.passwordsNotMatch || "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${username}/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          newPassword,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: t.messages.success,
          description: t.hostingSettings?.passwordChanged || "Password changed successfully",
        });
        // Clear form
        setNewPassword("");
        setConfirmPassword("");
        resetTurnstile();
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.hostingSettings?.passwordChangeFailed || "Failed to change password",
          variant: "destructive",
        });
        resetTurnstile();
      }
    } catch {
      toast({
        title: t.messages.error,
        description: t.hosting.cannotConnect,
        variant: "destructive",
      });
      resetTurnstile();
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check turnstile
    if (requiresTurnstile && !turnstileToken) {
      toast({
        title: t.messages.error,
        description: t.hostingSettings?.captchaRequired || "Please complete the captcha verification",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdatingLabel(true);
    
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${username}/label`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          label,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: t.messages.success,
          description: t.hostingSettings.labelUpdated,
        });
        resetTurnstile();
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.hostingSettings.labelUpdateFailed,
          variant: "destructive",
        });
        resetTurnstile();
      }
    } catch {
      toast({
        title: t.messages.error,
        description: t.hosting.cannotConnect,
        variant: "destructive",
      });
      resetTurnstile();
    } finally {
      setIsUpdatingLabel(false);
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check turnstile
    if (requiresTurnstile && !turnstileToken) {
      toast({
        title: t.messages.error,
        description: t.hostingSettings?.captchaRequired || "Please complete the captcha verification",
        variant: "destructive",
      });
      return;
    }
    
    // Confirm before deactivating
    if (!confirm(t.hostingSettings.confirmDeactivate)) {
      return;
    }
    
    setIsDeactivating(true);
    
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/hosting/${username}/deactivate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          reason: deactivateReason,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: t.hostingSettings.deactivated,
          description: t.hostingSettings.deactivatedDesc,
        });
        // Redirect to hosting details after deactivation
        navigate(`/user/hosting/${username}`);
      } else {
        toast({
          title: t.messages.error,
          description: result.error || t.hostingSettings.deactivateFailed,
          variant: "destructive",
        });
        resetTurnstile();
      }
    } catch {
      toast({
        title: t.messages.error,
        description: t.hosting.cannotConnect,
        variant: "destructive",
      });
      resetTurnstile();
    } finally {
      setIsDeactivating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          to={`/user/hosting/${username}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.hostingSettings.backToDetails}
        </Link>

        {/* Page header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.hostingSettings.title}</h1>
            <p className="text-muted-foreground">
              {t.hostingSettings.subtitle}
            </p>
            {hosting && (
              <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">
                {hosting.domain}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="w-4 h-4" />
              {t.hostingSettings?.tabGeneral || "General"}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2" disabled={hosting?.status !== 'ACTIVE'}>
              <ShieldCheck className="w-4 h-4" />
              {t.hostingSettings?.tabSecurity || "Security"}
            </TabsTrigger>
            <TabsTrigger value="danger" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t.hostingSettings?.tabDanger || "Danger Zone"}
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.hostingSettings.generalSettings}</CardTitle>
                <CardDescription>
                  {t.hostingSettings?.generalSettingsDesc || "Configure basic settings for your hosting account"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateLabel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">{t.hostingSettings.accountLabel}</Label>
                    <Input
                      id="label"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder={t.hostingSettings.enterLabel}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.hostingSettings.labelHelp}
                    </p>
                  </div>
                  
                  {/* Turnstile for label change */}
                  {requiresTurnstile && turnstileConfig?.siteKey && (
                    <TurnstileWidget
                      key={`label-${turnstileKey}`}
                      siteKey={turnstileConfig.siteKey}
                      onVerify={handleTurnstileVerify}
                      onExpire={resetTurnstile}
                      className="mt-4"
                    />
                  )}
                  
                  <Button type="submit" disabled={isUpdatingLabel || (requiresTurnstile && !turnstileToken)}>
                    {isUpdatingLabel ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {t.hostingSettings.updateLabel}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {hosting?.status === 'ACTIVE' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    {t.hostingSettings?.changePassword || "Change Password"}
                  </CardTitle>
                  <CardDescription>
                    {t.hostingSettings?.changePasswordDesc || "Change your cPanel, FTP and MySQL password"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">{t.hostingSettings?.newPassword || "New Password"}</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t.hostingSettings?.enterNewPassword || "Enter new password"}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t.hostingSettings?.confirmPassword || "Confirm Password"}</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t.hostingSettings?.confirmNewPassword || "Confirm new password"}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.hostingSettings?.passwordHelp || "8-20 characters, letters and numbers only (no special characters)"}
                    </p>
                    
                    {/* Turnstile for password change */}
                    {requiresTurnstile && turnstileConfig?.siteKey && (
                      <TurnstileWidget
                        key={`password-${turnstileKey}`}
                        siteKey={turnstileConfig.siteKey}
                        onVerify={handleTurnstileVerify}
                        onExpire={resetTurnstile}
                        className="mt-4"
                      />
                    )}
                    
                    <Button 
                      type="submit" 
                      disabled={isChangingPassword || !newPassword || !confirmPassword || (requiresTurnstile && !turnstileToken)}
                    >
                      {isChangingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Key className="w-4 h-4 mr-2" />
                      )}
                      {t.hostingSettings?.changePasswordButton || "Change Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground py-8">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t.hostingSettings?.securityNotAvailable || "Security settings are only available for active hosting accounts."}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  {t.hostingSettings.dangerZone}
                </CardTitle>
                <CardDescription>
                  {t.hostingSettings.deactivateWarning}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hosting?.status === 'ACTIVE' ? (
                  <form onSubmit={handleDeactivate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reason">{t.hostingSettings.deactivateReason}</Label>
                      <Textarea
                        id="reason"
                        value={deactivateReason}
                        onChange={(e) => setDeactivateReason(e.target.value)}
                        placeholder={t.hostingSettings.deactivateReasonPlaceholder}
                        rows={4}
                      />
                    </div>
                    
                    {/* Rate limit warning */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {t.hostingSettings?.deactivateRateLimit || "You can only deactivate hosting accounts 2 times per day (12 hours apart)."}
                      </p>
                    </div>
                    
                    {/* Turnstile for deactivation */}
                    {requiresTurnstile && turnstileConfig?.siteKey && (
                      <TurnstileWidget
                        key={`deactivate-${turnstileKey}`}
                        siteKey={turnstileConfig.siteKey}
                        onVerify={handleTurnstileVerify}
                        onExpire={resetTurnstile}
                        className="mt-4"
                      />
                    )}
                    
                    <Button 
                      type="submit" 
                      variant="destructive" 
                      disabled={isDeactivating || !deactivateReason.trim() || (requiresTurnstile && !turnstileToken)}
                    >
                      {isDeactivating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      {t.hostingSettings.deactivateButton}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t.hostingSettings?.alreadyDeactivated || "This hosting account is not active and cannot be deactivated."}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default HostingSettings;
