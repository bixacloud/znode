import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Server, Eye, EyeOff, ArrowRight, Mail, Lock, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSite, usePageTitle } from "@/contexts/SiteContext";
import authService, { OAuthStatus } from "@/services/auth";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

  const { register } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { settings } = useSite();
  const navigate = useNavigate();
  
  usePageTitle(t.auth?.register || 'Register');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: t.common.error,
        description: t.auth.passwordMismatch,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(email, password, name || undefined);
      toast({
        title: t.auth.registerSuccess,
        description: t.auth.welcomeToFreeHost,
      });
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast({
        title: t.auth.registerFailed,
        description: error.error || t.auth.errorOccurred,
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

  const passwordRequirements = [
    { label: t.auth.passwordRequirements.minLength, met: password.length >= 8 },
    { label: t.auth.passwordRequirements.uppercase, met: /[A-Z]/.test(password) },
    { label: t.auth.passwordRequirements.number, met: /[0-9]/.test(password) },
  ];

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
            {t.auth.createFreeAccount}
          </h1>
          <p className="text-lg text-primary-foreground/70 max-w-md mb-8">
            {t.auth.onlyTakesMinute}
          </p>
          
          <div className="space-y-4">
            {(t.auth.freeFeatures as string[]).map((feature: string) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-primary-foreground/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Registration form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
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
            <h2 className="text-2xl font-bold text-foreground mb-2">{t.auth.register}</h2>
            <p className="text-muted-foreground">
              {t.auth.createAccountSubtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t.auth.fullName}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder={t.auth.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

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
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
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
              
              {/* Password requirements */}
              {password && (
                <div className="mt-2 space-y-1.5">
                  {passwordRequirements.map((req) => (
                    <div key={req.label} className={`flex items-center gap-2 text-sm ${req.met ? "text-green-500" : "text-muted-foreground"}`}>
                      <CheckCircle className={`w-4 h-4 ${req.met ? "text-green-500" : "text-muted-foreground/50"}`} />
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-destructive">{t.auth.passwordMismatch}</p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                required
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                {t.auth.agreeToTerms}{" "}
                <a href="#" className="text-primary hover:underline">{t.auth.termsOfService}</a>
                {" "}{t.auth.and}{" "}
                <a href="#" className="text-primary hover:underline">{t.auth.privacyPolicy}</a>
              </label>
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full" 
              disabled={isLoading || !agreeTerms || password !== confirmPassword}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {t.auth.createAccount}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {t.auth.haveAccount}{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                {t.auth.login}
              </Link>
            </p>
          </div>

          {hasAnyOAuthEnabled && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">{t.auth.registerWith}</span>
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

export default Register;
