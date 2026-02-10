import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Key,
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Smartphone,
  AlertTriangle,
  FileSignature,
  User,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import RichTextEditor from "@/components/RichTextEditor";

const API_URL = import.meta.env.VITE_API_URL || "https://demo.znode.app";

const AdminAccountSettings = () => {
  const { t } = useLanguage();
  usePageTitle(t.admin?.accountSettings || 'Account Settings');
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  
  // Display name state
  const [displayName, setDisplayName] = useState(user?.name || "");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);
  
  // Signature state
  const [signature, setSignature] = useState("");

  // Get 2FA status
  const { data: twoFactorStatus, refetch: refetch2FA } = useQuery({
    queryKey: ["admin-2fa-status"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/2fa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to get 2FA status");
      return res.json();
    },
  });

  // Get admin signature
  const { data: signatureData } = useQuery({
    queryKey: ["admin-signature"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/admin/signature`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to get signature");
      return res.json();
    },
  });

  useEffect(() => {
    if (signatureData?.signature) {
      setSignature(signatureData.signature);
    }
  }, [signatureData]);

  // Update display name mutation
  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/profile/name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update name");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t.userSettings?.nameChanged || "Name updated",
        description: t.userSettings?.nameChangedDesc || "Your display name has been updated successfully",
      });
      refreshUser();
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t.userSettings?.passwordChanged || "Password changed",
        description: t.userSettings?.passwordChangedDesc || "Your password has been updated successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Setup 2FA mutation
  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/2fa/setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to setup 2FA");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setShow2FASetup(true);
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify 2FA mutation
  const verify2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to verify 2FA");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setShow2FASetup(false);
      setVerifyCode("");
      setQrCode("");
      setSecret("");
      refetch2FA();
      
      if (data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        setShowRecoveryCodes(true);
      } else {
        toast({
          title: t.userSettings?.twoFactorEnabled || "2FA Enabled",
          description: t.userSettings?.twoFactorEnabledDesc || "Two-factor authentication is now active",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: async (data: { code: string; password: string }) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/2fa/disable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to disable 2FA");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t.userSettings?.twoFactorDisabled || "2FA Disabled",
        description: t.userSettings?.twoFactorDisabledDesc || "Two-factor authentication has been disabled",
      });
      setShow2FADisable(false);
      setDisableCode("");
      setDisablePassword("");
      refetch2FA();
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update signature mutation
  const updateSignatureMutation = useMutation({
    mutationFn: async (sig: string) => {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/user-settings/admin/signature`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signature: sig }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update signature");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t.adminSettings?.signatureSaved || "Signature saved",
        description: t.adminSettings?.signatureSavedDesc || "Your signature has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t.common?.error || "Error",
        description: t.auth?.passwordMismatch || "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: t.common?.error || "Error",
        description: t.userSettings?.passwordTooShort || "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleUpdateName = () => {
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      toast({
        title: t.common?.error || "Error",
        description: t.userSettings?.nameInvalid || "Name must be between 2 and 50 characters",
        variant: "destructive",
      });
      return;
    }
    updateNameMutation.mutate(trimmedName);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setRecoveryCodesCopied(true);
    setTimeout(() => setRecoveryCodesCopied(false), 2000);
    toast({
      title: t.userSettings?.recoveryCodesCopied || "Copied",
      description: t.userSettings?.recoveryCodesCopiedDesc || "Recovery codes copied to clipboard",
    });
  };

  const downloadRecoveryCodes = () => {
    const content = `Recovery Codes\n${'='.repeat(30)}\n\n${recoveryCodes.join('\n')}\n\nKeep these codes in a safe place.\nEach code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseRecoveryCodes = () => {
    setShowRecoveryCodes(false);
    setRecoveryCodes([]);
    toast({
      title: t.userSettings?.twoFactorEnabled || "2FA Enabled",
      description: t.userSettings?.twoFactorEnabledDesc || "Two-factor authentication is now active",
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t.adminSettings?.accountTitle || "Account Settings"}</h1>
          <p className="text-muted-foreground">
            {t.adminSettings?.accountSubtitle || "Manage your admin account security and preferences"}
          </p>
        </div>

        {/* Display Name Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t.userSettings?.displayName || "Display Name"}
            </CardTitle>
            <CardDescription>
              {t.userSettings?.displayNameDesc || "Change your display name"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t.userSettings?.displayName || "Display Name"}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.userSettings?.displayNamePlaceholder || "Enter your display name"}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                {t.userSettings?.displayNameHint || "2-50 characters"}
              </p>
            </div>
            <Button
              onClick={handleUpdateName}
              disabled={updateNameMutation.isPending || displayName.trim() === user?.name}
            >
              {updateNameMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.common?.save || "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t.userSettings?.password || "Password"}
            </CardTitle>
            <CardDescription>
              {t.userSettings?.passwordDesc || "Change your account password"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                {t.userSettings?.currentPassword || "Current Password"}
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {t.userSettings?.newPassword || "New Password"}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t.userSettings?.confirmPassword || "Confirm New Password"}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            >
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.userSettings?.changePassword || "Change Password"}
            </Button>
          </CardContent>
        </Card>

        {/* 2FA Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t.userSettings?.twoFactor || "Two-Factor Authentication"}
            </CardTitle>
            <CardDescription>
              {t.userSettings?.twoFactorDesc || "Add an extra layer of security to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {twoFactorStatus?.enabled ? (
              <div className="space-y-4">
                <Alert className="border-green-500/50 bg-green-500/10">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">
                    {t.userSettings?.twoFactorActive || "2FA is active"}
                  </AlertTitle>
                  <AlertDescription>
                    {t.userSettings?.twoFactorActiveDesc || "Your account is protected with 2FA"}
                  </AlertDescription>
                </Alert>
                <Button
                  variant="destructive"
                  onClick={() => setShow2FADisable(true)}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {t.userSettings?.disable || "Disable"} 2FA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t.userSettings?.twoFactorInactive || "2FA is not enabled"}</AlertTitle>
                  <AlertDescription>
                    {t.userSettings?.twoFactorInactiveDesc || "Enable 2FA for better security"}
                  </AlertDescription>
                </Alert>
                <Button onClick={() => setup2FAMutation.mutate()}>
                  {setup2FAMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t.userSettings?.enable || "Enable"} 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              {t.adminSettings?.ticketSignature || "Ticket Signature"}
            </CardTitle>
            <CardDescription>
              {t.adminSettings?.ticketSignatureDesc || "This signature will be automatically added to your ticket replies"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t.adminSettings?.signatureEditor || "Signature Editor"}</Label>
              <RichTextEditor
                value={signature}
                onChange={setSignature}
                placeholder={t.adminSettings?.signaturePlaceholder || "Enter your signature here..."}
                minHeight={150}
              />
            </div>
            <Button
              onClick={() => updateSignatureMutation.mutate(signature)}
              disabled={updateSignatureMutation.isPending}
            >
              {updateSignatureMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.adminSettings?.saveSignature || "Save Signature"}
            </Button>
          </CardContent>
        </Card>

        {/* 2FA Setup Dialog */}
        <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.userSettings?.setup2FA || "Setup Two-Factor Authentication"}</DialogTitle>
              <DialogDescription>
                {t.userSettings?.setup2FADesc || "Scan the QR code with your authenticator app"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="2FA QR Code" className="rounded-lg" />
                </div>
              )}
              <div className="space-y-2">
                <Label>{t.userSettings?.manualEntry || "Manual entry code"}</Label>
                <div className="flex gap-2">
                  <Input value={secret} readOnly className="font-mono text-sm" />
                  <Button size="icon" variant="outline" onClick={copySecret}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.userSettings?.verificationCode || "Enter verification code"}</Label>
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShow2FASetup(false)}>
                {t.common?.cancel || "Cancel"}
              </Button>
              <Button
                onClick={() => verify2FAMutation.mutate(verifyCode)}
                disabled={verify2FAMutation.isPending || verifyCode.length !== 6}
              >
                {verify2FAMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.userSettings?.verify || "Verify & Enable"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2FA Disable Dialog */}
        <Dialog open={show2FADisable} onOpenChange={setShow2FADisable}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.userSettings?.disable2FA || "Disable Two-Factor Authentication"}</DialogTitle>
              <DialogDescription>
                {t.userSettings?.disable2FADesc || "Enter your password and 2FA code to disable"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t.userSettings?.disable2FAWarning || "Disabling 2FA will make your account less secure."}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>{t.userSettings?.password || "Password"}</Label>
                <Input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.userSettings?.twoFactorCode || "2FA Code"}</Label>
                <Input
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShow2FADisable(false)}>
                {t.common?.cancel || "Cancel"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => disable2FAMutation.mutate({ code: disableCode, password: disablePassword })}
                disabled={disable2FAMutation.isPending || disableCode.length !== 6 || !disablePassword}
              >
                {disable2FAMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.userSettings?.disable || "Disable"} 2FA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recovery Codes Dialog */}
        <Dialog open={showRecoveryCodes} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                {t.userSettings?.recoveryCodesTitle || "Recovery Codes"}
              </DialogTitle>
              <DialogDescription>
                {t.userSettings?.recoveryCodesDesc || "Save these recovery codes in a safe place. Each code can only be used once to sign in if you lose access to your authenticator app."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t.common?.warning || "Warning"}</AlertTitle>
                <AlertDescription>
                  {t.userSettings?.recoveryCodesWarning || "These codes will only be shown once. Make sure to save them now."}
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {recoveryCodes.map((code, i) => (
                  <div key={i} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copyRecoveryCodes}>
                  {recoveryCodesCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {t.userSettings?.copyAll || "Copy All"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={downloadRecoveryCodes}>
                  <Download className="w-4 h-4 mr-2" />
                  {t.userSettings?.download || "Download"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCloseRecoveryCodes}>
                {t.userSettings?.savedCodes || "I've saved these codes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAccountSettings;
