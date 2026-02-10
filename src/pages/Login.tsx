import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Server, Eye, EyeOff, ArrowRight, Mail, Lock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSite, usePageTitle } from "@/contexts/SiteContext";
import authService, { OAuthStatus } from "@/services/auth";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K+`;
  return `${count}+`;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { settings } = useSite();
  const navigate = useNavigate();
  const location = useLocation();
  
  usePageTitle(t.auth?.login || 'Login');
  
  const from = (location.state as { from?: Location })?.from?.pathname || '/user/dashboard';

  // Load saved emails on mount
  useEffect(() => {
    const saved = localStorage.getItem('savedEmails');
    if (saved) {
      const emails = JSON.parse(saved) as string[];
      setSavedEmails(emails);
      // Auto-fill last used email
      if (emails.length > 0) {
        setEmail(emails[0]);
        setRememberMe(true);
      }
    }
  }, []);

  // Fetch OAuth status
  useEffect(() => {
    const fetchOAuthStatus = async () => {
      try {
        const status = await authService.getOAuthStatus();
        setOauthStatus(status);
      } catch (error) {
        console.error('Failed to fetch OAuth status:', error);
      }
    };
    fetchOAuthStatus();
  }, []);

  // Fetch public stats (user count)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/public-stats`);
        const data = await res.json();
        if (res.ok) setTotalUsers(data.totalUsers);
      } catch {}
    };
    fetchStats();
  }, []);

  // Check if system is installed on first load
  useEffect(() => {
    const checkInstallStatus = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
        const res = await fetch(`${API_URL}/api/install/status`);
        const data = await res.json();
        if (!data.installed) {
          navigate('/install', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Failed to check install status:', error);
      } finally {
        setIsCheckingAdmin(false);
      }
    };
    checkInstallStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await authService.login({ email, password });
      
      // Check if 2FA is required - redirect to 2FA page
      if (response.requires2FA) {
        navigate('/2fa-verify', { 
          state: { 
            tempToken: response.tempToken, 
            email,
            from 
          },
          replace: true 
        });
        return;
      }
      
      // Save email if remember me is checked
      if (rememberMe) {
        const saved = localStorage.getItem('savedEmails');
        let emails: string[] = saved ? JSON.parse(saved) : [];
        // Remove if exists and add to front
        emails = emails.filter(e => e !== email);
        emails.unshift(email);
        // Keep only last 5 emails
        emails = emails.slice(0, 5);
        localStorage.setItem('savedEmails', JSON.stringify(emails));
      }
      
      // Refresh user state in context
      await refreshUser();
      toast({
        title: t.auth.loginSuccess,
        description: t.auth.welcomeBack,
      });
      // Redirect based on user role
      if (response.user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      toast({
        title: t.auth.loginFailed,
        description: error.error || t.auth.invalidCredentials,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'facebook' | 'microsoft' | 'discord' | 'github') => {
    const urls = {
      google: authService.getGoogleLoginUrl(),
      facebook: authService.getFacebookLoginUrl(),
      microsoft: authService.getMicrosoftLoginUrl(),
      discord: authService.getDiscordLoginUrl(),
      github: authService.getGithubLoginUrl(),
    };
    window.location.href = urls[provider];
  };

  // Check if any OAuth provider is enabled
  const hasAnyOAuthEnabled = oauthStatus && (
    oauthStatus.google || oauthStatus.facebook || oauthStatus.microsoft || oauthStatus.discord || oauthStatus.github
  );

  // Show loading while checking admin status
  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link to="/" className="flex items-center gap-2 mb-12">
            {settings.siteLogo ? (
              <img src={settings.siteLogo} alt={settings.siteName} className="w-12 h-12 rounded-xl object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Server className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <span className="text-2xl font-bold text-primary-foreground">{settings.siteName}</span>
          </Link>
          
          <h1 className="text-4xl font-bold text-primary-foreground mb-6">
            {t.auth.welcomeBackTitle}
          </h1>
          <p className="text-lg text-primary-foreground/70 max-w-md">
            {t.auth.welcomeBackSubtitle}
          </p>
          
          <div className="mt-16 grid grid-cols-3 gap-4">
            {[
              { label: t.auth.accounts, value: totalUsers !== null ? formatCount(totalUsers) : '...' },
              { label: t.auth.uptime, value: "99.9%" },
              { label: t.auth.support, value: "24/7" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10">
                <div className="text-2xl font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-sm text-primary-foreground/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            {settings.siteLogo ? (
              <img src={settings.siteLogo} alt={settings.siteName} className="w-10 h-10 rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Server className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <span className="text-xl font-bold text-foreground">{settings.siteName}</span>
          </Link>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">{t.auth.login}</h2>
            <p className="text-muted-foreground">
              {t.auth.enterCredentials}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Show banner if user has an active 2FA support ticket */}
            {localStorage.getItem('2fa_support_token') && (
              <div 
                className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/15 transition-colors"
                onClick={() => navigate('/support/2fa')}
              >
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {t.support2fa?.activeTicket || "You have an active support ticket"}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    {t.support2fa?.clickToResume || "Click to continue your conversation"}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => savedEmails.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pl-10 h-12"
                  required
                  autoComplete="email"
                />
                {/* Email suggestions dropdown */}
                {showSuggestions && savedEmails.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
                    {savedEmails.map((savedEmail, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                        onClick={() => {
                          setEmail(savedEmail);
                          setShowSuggestions(false);
                        }}
                      >
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {savedEmail}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                {t.auth.rememberMe}
              </Label>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t.auth.login}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              {t.auth.noAccount}{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                {t.auth.registerFree}
              </Link>
            </p>
          </div>

          {hasAnyOAuthEnabled && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">{t.auth.loginWith}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {oauthStatus?.google && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full"
                    onClick={() => handleOAuthLogin('google')}
                    type="button"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </Button>
                )}
                {oauthStatus?.facebook && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full"
                    onClick={() => handleOAuthLogin('facebook')}
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </Button>
                )}
                {oauthStatus?.microsoft && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full"
                    onClick={() => handleOAuthLogin('microsoft')}
                    type="button"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#F25022" d="M1 1h10v10H1z"/>
                      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                      <path fill="#FFB900" d="M13 13h10v10H13z"/>
                    </svg>
                    Microsoft
                  </Button>
                )}
                {oauthStatus?.discord && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full"
                    onClick={() => handleOAuthLogin('discord')}
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                    </svg>
                    Discord
                  </Button>
                )}
                {oauthStatus?.github && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full"
                    onClick={() => handleOAuthLogin('github')}
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
