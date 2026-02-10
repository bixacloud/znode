import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Server, Shield, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "https://demo.znode.app";

const TwoFactorVerify = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get state from login page
  const { tempToken, email, from } = (location.state as { 
    tempToken?: string; 
    email?: string;
    from?: string;
  }) || {};

  // Redirect if no temp token
  useEffect(() => {
    if (!tempToken) {
      navigate('/login', { replace: true });
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!useRecoveryCode && code.length !== 6) {
      toast({
        title: t.common?.error || "Error",
        description: t.auth?.invalidCode || "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (useRecoveryCode && code.trim().length === 0) {
      toast({
        title: t.common?.error || "Error",
        description: t.auth?.enterRecoveryCode || "Please enter a recovery code",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code: code.trim(), tempToken, isRecoveryCode: useRecoveryCode }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }
      
      if (data.verified && data.accessToken) {
        // Store token
        localStorage.setItem("accessToken", data.accessToken);
        
        // Refresh user state
        await refreshUser();
        
        toast({
          title: t.auth?.loginSuccess || "Login successful",
          description: t.auth?.welcomeBack || "Welcome back!",
        });
        
        // Redirect based on user role
        if (data.user?.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate(from || '/user/dashboard', { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: t.common?.error || "Error",
        description: error.message || t.auth?.invalidCode || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/login', { replace: true });
  };

  if (!tempToken) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.auth?.twoFactorTitle || "Two-Factor Authentication"}
          </h1>
          <p className="text-muted-foreground text-center">
            {useRecoveryCode 
              ? (t.auth?.recoveryCodeSubtitle || "Enter one of your recovery codes")
              : (t.auth?.twoFactorSubtitle || "Enter the verification code from your authenticator app")}
          </p>
          {email && (
            <p className="text-sm text-muted-foreground mt-2">
              {email}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code" className="sr-only">
              {useRecoveryCode 
                ? (t.auth?.recoveryCode || "Recovery Code")
                : (t.auth?.twoFactorCode || "Authentication Code")}
            </Label>
            {useRecoveryCode ? (
              <Input
                id="code"
                type="text"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="h-16 text-center text-2xl tracking-[0.3em] font-mono"
                autoComplete="off"
                autoFocus
              />
            ) : (
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-16 text-center text-3xl tracking-[0.5em] font-mono"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            )}
            <p className="text-xs text-muted-foreground text-center">
              {useRecoveryCode
                ? (t.auth?.recoveryCodeHint || "Enter one of your saved recovery codes")
                : (t.auth?.twoFactorHint || "Enter the 6-digit code from your authenticator app")}
            </p>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full" 
            disabled={isLoading || (useRecoveryCode ? code.trim().length === 0 : code.length !== 6)}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {t.auth?.verify || "Verify"}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common?.back || "Back to login"}
          </Button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <button
            type="button"
            onClick={() => {
              setUseRecoveryCode(!useRecoveryCode);
              setCode("");
            }}
            className="text-sm text-primary hover:underline"
          >
            {useRecoveryCode 
              ? (t.auth?.useAuthenticatorApp || "Use authenticator app instead")
              : (t.auth?.useRecoveryCode || "Use a recovery code")}
          </button>
          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground mb-1">
              {t.auth?.cantAccessApp || "Can't access your authenticator app?"}
            </p>
            <button
              type="button"
              onClick={() => navigate('/support/2fa', { state: { tempToken, email } })}
              className="text-sm text-primary hover:underline"
            >
              {t.auth?.contactSupport || "Contact Support"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
