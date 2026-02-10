import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Mail, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Declare Turnstile types
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function VerifyEmail() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { settings, isLoading: settingsLoading } = useSite();
  const { toast } = useToast();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle' | 'captcha'>('idle');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ valid: boolean; email?: string; requireOtp?: boolean } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);
  const tokenCheckedRef = useRef(false);

  const token = searchParams.get('token');

  // Check token validity - wait for settings to load first
  useEffect(() => {
    if (token && !settingsLoading && !tokenCheckedRef.current) {
      tokenCheckedRef.current = true;
      checkToken(token);
    }
  }, [token, settingsLoading]);

  const checkToken = async (token: string) => {
    setStatus('loading');
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email/${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setTokenInfo(data);
        
        // Check if any verification step is required (captcha or OTP)
        const requiresCaptcha = settings?.turnstileEnabled && settings?.turnstileSiteKey;
        const requiresOtp = data.requireOtp;
        
        if (requiresCaptcha || requiresOtp) {
          setStatus('captcha');
          if (requiresCaptcha) {
            loadTurnstile();
          }
        } else {
          // No captcha or OTP required, verify directly
          verifyEmail(token, null);
        }
      } else {
        setStatus('error');
        setMessage(data.error || t.auth?.verificationFailed || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage(t.auth?.verificationFailed || 'Verification failed');
    }
  };

  const loadTurnstile = useCallback(() => {
    if (scriptLoadedRef.current) {
      renderTurnstile();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      renderTurnstile();
    };
    document.body.appendChild(script);
  }, []);

  const renderTurnstile = useCallback(() => {
    if (!turnstileRef.current || !window.turnstile || !settings?.turnstileSiteKey) return;

    // Clear previous widget
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {}
    }

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: settings.turnstileSiteKey,
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      'error-callback': () => {
        setTurnstileToken(null);
      },
      'expired-callback': () => {
        setTurnstileToken(null);
      },
      theme: 'auto',
    });
  }, [settings?.turnstileSiteKey]);

  useEffect(() => {
    if (status === 'captcha' && settings?.turnstileSiteKey) {
      const timer = setTimeout(() => {
        renderTurnstile();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status, settings?.turnstileSiteKey, renderTurnstile]);

  const verifyEmail = async (emailToken: string, captchaToken: string | null) => {
    setStatus('loading');
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: emailToken,
          turnstileToken: captchaToken,
          otp: otpCode || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || t.auth?.emailVerified || 'Email verified!');
        await refreshUser();
        setTimeout(() => {
          navigate('/user/dashboard', { replace: true });
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || t.auth?.verificationFailed || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage(t.auth?.verificationFailed || 'Verification failed');
    }
  };

  const handleVerifyWithCaptcha = () => {
    if (!token) return;
    
    // Check if OTP is required but not provided
    if (tokenInfo?.requireOtp && !otpCode) {
      toast({
        variant: 'destructive',
        title: t.common?.error || 'Error',
        description: t.auth?.otpRequired || 'Please enter the OTP code from your email',
      });
      return;
    }
    
    // Check if captcha is required but not completed
    const requiresCaptcha = settings?.turnstileEnabled && settings?.turnstileSiteKey;
    if (requiresCaptcha && !turnstileToken) {
      toast({
        variant: 'destructive',
        title: t.common?.error || 'Error',
        description: t.auth?.completeCaptcha || 'Please complete the captcha',
      });
      return;
    }
    
    verifyEmail(token, turnstileToken);
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      // Get token from authService or localStorage
      const accessToken = localStorage.getItem('accessToken');
      
      if (!accessToken) {
        toast({
          variant: 'destructive',
          title: t.common?.error || 'Error',
          description: t.auth?.notLoggedIn || 'You are not logged in',
        });
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: t.auth?.verificationSent || 'Verification email sent',
          description: t.auth?.checkYourEmail || 'Please check your email',
        });
      } else {
        toast({
          variant: 'destructive',
          title: t.common?.error || 'Error',
          description: data.error || t.auth?.sendVerificationFailed || 'Failed to send',
        });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast({
        variant: 'destructive',
        title: t.common?.error || 'Error',
        description: t.auth?.sendVerificationFailed || 'Failed to send',
      });
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect anyway
      window.location.href = '/login';
    }
  };

  // If there's a token in URL, show verification progress
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {(status === 'loading' || status === 'idle') && <Loader2 className="h-6 w-6 animate-spin" />}
              {status === 'captcha' && <ShieldCheck className="h-6 w-6 text-blue-500" />}
              {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
              {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
              {t.auth?.emailVerification || 'Email Verification'}
            </CardTitle>
            {tokenInfo?.email && status === 'captcha' && (
              <CardDescription>
                {t.auth?.verifyingEmailFor || 'Verifying email for'} <strong>{tokenInfo.email}</strong>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {(status === 'loading' || status === 'idle') && (
              <p className="text-muted-foreground">{t.auth?.verifyingEmail || 'Verifying email...'}</p>
            )}
            
            {status === 'captcha' && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {t.auth?.completeVerification || 'Please complete the verification steps below'}
                </p>
                
                {/* OTP Input - Always show if requireOtp */}
                {tokenInfo?.requireOtp && (
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="w-4 h-4" />
                      {t.auth?.otpCode || 'OTP Code'}
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl tracking-widest font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.auth?.otpSentToEmail || 'Enter the 6-digit code sent to your email'}
                    </p>
                  </div>
                )}

                {/* Captcha - Show if Turnstile is enabled */}
                {settings?.turnstileEnabled && settings?.turnstileSiteKey && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck className="w-4 h-4" />
                      {t.auth?.captchaVerification || 'Captcha Verification'}
                    </Label>
                    <div ref={turnstileRef} className="flex justify-center" />
                  </div>
                )}

                <Button 
                  onClick={handleVerifyWithCaptcha}
                  disabled={
                    (tokenInfo?.requireOtp && otpCode.length !== 6) ||
                    (settings?.turnstileEnabled && settings?.turnstileSiteKey && !turnstileToken)
                  }
                  className="w-full"
                >
                  {t.auth?.verify || 'Verify Email'}
                </Button>
              </div>
            )}
            
            {status === 'success' && (
              <>
                <p className="text-green-600">{message}</p>
                <p className="text-sm text-muted-foreground">{t.auth?.redirectingToDashboard || 'Redirecting...'}</p>
              </>
            )}
            
            {status === 'error' && (
              <>
                <p className="text-red-600">{message}</p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate('/login')} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t.auth?.backToLogin || 'Back to Login'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No token - show verification required page (for logged in users)
  // If user is not logged in, redirect to login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{t.auth?.emailVerification || 'Email Verification'}</CardTitle>
            <CardDescription>
              {t.auth?.verificationFailed || 'Invalid or expired verification link'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t.auth?.checkYourEmail || 'Please login to request a new verification email.'}
            </p>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.auth?.backToLogin || 'Back to Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{t.auth?.verifyYourEmail || 'Verify Your Email'}</CardTitle>
          <CardDescription>
            {t.auth?.verificationEmailSentTo || 'A verification email has been sent to'} <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t.auth?.checkYourInbox || 'Please check your inbox and click on the verification link.'}
          </p>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={resendVerification} 
              disabled={resending}
              className="w-full"
            >
              {resending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.auth?.resendVerification || 'Resend verification email'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full"
            >
              {t.auth?.useAnotherAccount || 'Use another account'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t.auth?.verificationLinkExpires || 'The verification link is valid for 30 minutes.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
