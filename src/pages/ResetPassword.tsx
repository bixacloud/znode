import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, CheckCircle, Loader2, XCircle, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenError(t.auth?.invalidToken || "Invalid or missing token");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify-reset-token?token=${token}`);
        const data = await res.json();
        
        if (res.ok && data.valid) {
          setTokenValid(true);
          setEmail(data.email);
        } else {
          setTokenError(data.error || t.auth?.invalidToken || "Invalid or expired token");
        }
      } catch (error) {
        setTokenError(t.common?.networkError || "Network error. Please try again.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: t.common?.error || "Error",
        description: t.auth?.passwordRequired || "Password is required",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t.common?.error || "Error",
        description: t.auth?.passwordTooShort || "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t.common?.error || "Error",
        description: t.auth?.passwordMismatch || "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        toast({
          title: t.common?.success || "Success",
          description: t.auth?.passwordResetSuccess || "Your password has been reset successfully",
        });
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } else {
        toast({
          title: t.common?.error || "Error",
          description: data.error || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.common?.error || "Error",
        description: t.common?.networkError || "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">{t.common?.verifying || "Verifying..."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-destructive">
              {t.auth?.invalidLink || "Invalid Link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{tokenError}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              {t.auth?.requestNewLink || "Please request a new password reset link."}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button asChild className="w-full">
              <Link to="/forgot-password">
                {t.auth?.requestNewReset || "Request New Reset Link"}
              </Link>
            </Button>
            <Link 
              to="/login" 
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {t.auth?.backToLogin || "Back to Login"}
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              {t.auth?.passwordResetTitle || "Password Reset"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                {t.auth?.passwordResetSuccess || "Your password has been reset successfully. You will be redirected to login."}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/login">{t.auth?.loginNow || "Login Now"}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t.auth?.resetPassword || "Reset Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {t.auth?.resetPasswordDesc || "Enter your new password for"} <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth?.newPassword || "New Password"}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth?.confirmPassword || "Confirm Password"}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common?.processing || "Processing..."}
                </>
              ) : (
                t.auth?.resetPassword || "Reset Password"
              )}
            </Button>
          </CardFooter>
        </form>
        
        <div className="pb-6 text-center">
          <Link 
            to="/login" 
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            {t.auth?.backToLogin || "Back to Login"}
          </Link>
        </div>
      </Card>
    </div>
  );
}
