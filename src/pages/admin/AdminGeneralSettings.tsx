import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { 
  Settings, 
  Save, 
  Upload,
  Image,
  Globe,
  Shield,
  Mail,
  AlertTriangle,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Search,
  FileText,
  Bot,
  Map,
  Languages,
  Plus,
  Code,
  ExternalLink,
  Info,
  Puzzle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { availableLanguages } from "@/i18n/translations";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface TurnstileServices {
  emailVerify: boolean;
  createHosting: boolean;
  hostingSettings: boolean;
  createSSL: boolean;
  createTicket: boolean;
  replyTicket: boolean;
}

interface GeneralSettings {
  siteName: string;
  siteSlogan: string;
  siteLogo: string;
  siteFavicon: string;
  emailVerificationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceAllowedIPs: string;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  turnstileServices: TurnstileServices;
  imgbbApiKey: string;
}

interface SEOLanguageData {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterSite: string;
  twitterImage: string;
  customHeadTags: string;
}

interface SEOSettings {
  languages: Record<string, SEOLanguageData>;
  robotsTxt: string;
  sitemapEnabled: boolean;
  sitemapCustomUrls: string;
  canonicalUrl: string;
}

const defaultSEOLanguage: SEOLanguageData = {
  title: '',
  description: '',
  keywords: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterCard: 'summary_large_image',
  twitterSite: '',
  twitterImage: '',
  customHeadTags: '',
};

const defaultRobotsTxt = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: {{SITE_URL}}/sitemap.xml`;

const AdminGeneralSettings = () => {
  const token = authService.getAccessToken();
  const { toast } = useToast();
  const { t } = useLanguage();
  usePageTitle(t.admin?.generalSettings || 'General Settings');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<GeneralSettings>({
    siteName: '',
    siteSlogan: '',
    siteLogo: '',
    siteFavicon: '',
    emailVerificationEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: '',
    maintenanceAllowedIPs: '',
    turnstileEnabled: false,
    turnstileSiteKey: '',
    turnstileSecretKey: '',
    turnstileServices: {
      emailVerify: true,
      createHosting: false,
      hostingSettings: false,
      createSSL: false,
      createTicket: false,
      replyTicket: false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // SEO State
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    languages: {},
    robotsTxt: defaultRobotsTxt,
    sitemapEnabled: true,
    sitemapCustomUrls: '',
    canonicalUrl: '',
  });
  const [seoActiveLanguage, setSeoActiveLanguage] = useState<string>('en');
  const [savingSeo, setSavingSeo] = useState(false);

  // Fetch settings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-general-settings'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/settings/general`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: GeneralSettings) => {
      const response = await fetch(`${API_URL}/api/settings/general`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t.common?.success || 'Success',
        description: t.settings?.generalSaved || 'General settings saved successfully',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: t.common?.error || 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMutation.mutateAsync(settings);
    } finally {
      setSaving(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (type: 'logo' | 'favicon', file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.common?.error || 'Error',
        description: t.settings?.invalidImageType || 'Please select a valid image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t.common?.error || 'Error',
        description: t.settings?.imageTooLarge || 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      try {
        const response = await fetch(`${API_URL}/api/settings/general/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type, data: base64 }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload image');
        }

        const result = await response.json();
        
        // Update local state
        if (type === 'logo') {
          setSettings(prev => ({ ...prev, siteLogo: result.url }));
        } else {
          setSettings(prev => ({ ...prev, siteFavicon: result.url }));
        }

        toast({
          title: t.common?.success || 'Success',
          description: result.message,
        });
      } catch (error: any) {
        toast({
          title: t.common?.error || 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type: 'logo' | 'favicon') => {
    if (type === 'logo') {
      setSettings(prev => ({ ...prev, siteLogo: '' }));
    } else {
      setSettings(prev => ({ ...prev, siteFavicon: '' }));
    }
  };

  // ===== SEO =====
  // Fetch SEO settings
  const { data: seoData, refetch: refetchSeo } = useQuery({
    queryKey: ['admin-seo-settings'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/settings/seo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch SEO settings');
      return response.json();
    },
  });

  useEffect(() => {
    if (seoData?.settings) {
      setSeoSettings(prev => ({
        ...prev,
        ...seoData.settings,
      }));
    }
  }, [seoData]);

  // Helper: get current SEO language data
  const getSeoLangData = (lang: string): SEOLanguageData => {
    return seoSettings.languages[lang] || { ...defaultSEOLanguage };
  };

  // Helper: update SEO language data
  const updateSeoLangData = (lang: string, field: keyof SEOLanguageData, value: string) => {
    setSeoSettings(prev => ({
      ...prev,
      languages: {
        ...prev.languages,
        [lang]: {
          ...(prev.languages[lang] || { ...defaultSEOLanguage }),
          [field]: value,
        },
      },
    }));
  };

  // Save SEO settings
  const handleSaveSeo = async () => {
    setSavingSeo(true);
    try {
      const response = await fetch(`${API_URL}/api/settings/seo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(seoSettings),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save SEO settings');
      }
      toast({
        title: t.common?.success || 'Success',
        description: t.settings?.seoSaved || 'SEO settings saved successfully',
      });
      refetchSeo();
    } catch (error: any) {
      toast({
        title: t.common?.error || 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingSeo(false);
    }
  };

  // Count configured SEO languages
  const configuredSeoLangs = Object.keys(seoSettings.languages).filter(
    lang => seoSettings.languages[lang]?.title || seoSettings.languages[lang]?.description
  ).length;

  // Count enabled turnstile services
  const enabledServicesCount = settings.turnstileEnabled 
    ? Object.values(settings.turnstileServices).filter(Boolean).length 
    : 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6" />
              {t.settings?.generalSettings || 'General Settings'}
            </h1>
            <p className="text-muted-foreground">
              {t.settings?.generalSettingsDesc || 'Configure your website name, logo, and other general settings'}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t.common?.save || 'Save Changes'}
          </Button>
        </div>

        {/* Tabs Layout */}
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-[650px]">
            <TabsTrigger value="identity" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{t.settings?.siteIdentity || 'Identity'}</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">SEO</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{t.settings?.security || 'Security'}</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Puzzle className="w-4 h-4" />
              <span className="hidden sm:inline">{t.settings?.integrations || 'Integrations'}</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">{t.settings?.maintenance || 'Maintenance'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Site Identity */}
          <TabsContent value="identity" className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Site Name & Slogan */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    {t.settings?.siteInfo || 'Site Information'}
                  </CardTitle>
                  <CardDescription>
                    {t.settings?.siteInfoDesc || 'Basic information about your website'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">{t.settings?.siteName || 'Site Name'}</Label>
                    <Input
                      id="siteName"
                      value={settings.siteName}
                      onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                      placeholder="ZNode"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.settings?.siteNameHint || 'This will appear in the browser title and header'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteSlogan">{t.settings?.siteSlogan || 'Slogan / Tagline'}</Label>
                    <Input
                      id="siteSlogan"
                      value={settings.siteSlogan}
                      onChange={(e) => setSettings(prev => ({ ...prev, siteSlogan: e.target.value }))}
                      placeholder="Free Web Hosting"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.settings?.siteSloganHint || 'A short description of your website'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Branding */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    {t.settings?.branding || 'Branding'}
                  </CardTitle>
                  <CardDescription>
                    {t.settings?.brandingDesc || 'Upload your logo and favicon'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo */}
                  <div className="space-y-3">
                    <Label>{t.settings?.logo || 'Logo'}</Label>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {settings.siteLogo ? (
                          <div className="relative group">
                            <img 
                              src={settings.siteLogo} 
                              alt="Logo" 
                              className="h-16 w-auto max-w-[160px] object-contain border rounded-lg p-2 bg-background"
                            />
                            <button
                              onClick={() => handleRemoveImage('logo')}
                              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-16 w-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/30">
                            <Image className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload('logo', e.target.files[0])}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t.settings?.uploadLogo || 'Upload Logo'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {t.settings?.logoHint || 'PNG, JPG up to 2MB. Recommended: 200x50px'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Favicon */}
                  <div className="space-y-3">
                    <Label>{t.settings?.favicon || 'Favicon'}</Label>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {settings.siteFavicon ? (
                          <div className="relative group">
                            <img 
                              src={settings.siteFavicon} 
                              alt="Favicon" 
                              className="h-12 w-12 object-contain border rounded-lg p-1 bg-background"
                            />
                            <button
                              onClick={() => handleRemoveImage('favicon')}
                              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-12 w-12 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/30">
                            <Image className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload('favicon', e.target.files[0])}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => faviconInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t.settings?.uploadFavicon || 'Upload Favicon'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {t.settings?.faviconHint || 'PNG, ICO. Recommended: 32x32px or 64x64px'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: SEO */}
          <TabsContent value="seo" className="mt-6 space-y-6">
            {/* SEO Header with Save */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">{t.settings?.seoTitle || 'SEO & Meta Tags'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.settings?.seoDesc || 'Configure meta tags, robots.txt, and sitemap for search engines'}
                  </p>
                </div>
              </div>
              <Button onClick={handleSaveSeo} disabled={savingSeo} size="sm">
                {savingSeo ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t.settings?.saveSeo || 'Save SEO'}
              </Button>
            </div>

            {/* Language Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  {t.settings?.seoMetaTags || 'Meta Tags per Language'}
                  {configuredSeoLangs > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {configuredSeoLangs}/{availableLanguages.length} {t.settings?.seoConfigured || 'configured'}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {t.settings?.seoMetaTagsDesc || 'Each language can have its own SEO meta tags. When users switch language, meta tags update automatically.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language Tabs */}
                <div className="flex flex-wrap gap-2">
                  {availableLanguages.map(lang => {
                    const hasData = seoSettings.languages[lang.code]?.title || seoSettings.languages[lang.code]?.description;
                    return (
                      <Button
                        key={lang.code}
                        variant={seoActiveLanguage === lang.code ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeoActiveLanguage(lang.code)}
                        className="flex items-center gap-2"
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                        {hasData && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      </Button>
                    );
                  })}
                </div>

                {/* Active Language SEO Form */}
                <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{availableLanguages.find(l => l.code === seoActiveLanguage)?.flag || '🌐'}</span>
                    <h4 className="font-medium">{availableLanguages.find(l => l.code === seoActiveLanguage)?.nativeName || seoActiveLanguage}</h4>
                  </div>

                  {/* Basic Meta */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t.settings?.seoPageTitle || 'Page Title'}</Label>
                      <Input
                        value={getSeoLangData(seoActiveLanguage).title}
                        onChange={(e) => updateSeoLangData(seoActiveLanguage, 'title', e.target.value)}
                        placeholder={seoActiveLanguage === 'en' ? 'Free Hosting Platform - Create Your Website Today' : ''}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.settings?.seoPageTitleHint || 'Recommended: 50-60 characters. Shown in browser tab and search results.'}
                      </p>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t.settings?.seoDescription || 'Meta Description'}</Label>
                      <Textarea
                        value={getSeoLangData(seoActiveLanguage).description}
                        onChange={(e) => updateSeoLangData(seoActiveLanguage, 'description', e.target.value)}
                        placeholder={seoActiveLanguage === 'en' ? 'Free web hosting with SSL, cPanel, and 24/7 support. Deploy your website in minutes.' : ''}
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.settings?.seoDescriptionHint || 'Recommended: 150-160 characters. Shown below title in search results.'}
                      </p>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t.settings?.seoKeywords || 'Keywords'}</Label>
                      <Input
                        value={getSeoLangData(seoActiveLanguage).keywords}
                        onChange={(e) => updateSeoLangData(seoActiveLanguage, 'keywords', e.target.value)}
                        placeholder={seoActiveLanguage === 'en' ? 'free hosting, web hosting, cpanel, ssl, website builder' : ''}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.settings?.seoKeywordsHint || 'Comma-separated keywords. Used by some search engines.'}
                      </p>
                    </div>
                  </div>

                  {/* Open Graph */}
                  <div className="border-t pt-4">
                    <h5 className="font-medium flex items-center gap-2 mb-3">
                      <ExternalLink className="w-4 h-4" />
                      Open Graph ({t.settings?.seoSocialSharing || 'Social Sharing'})
                    </h5>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t.settings?.seoOgTitle || 'OG Title'}</Label>
                        <Input
                          value={getSeoLangData(seoActiveLanguage).ogTitle}
                          onChange={(e) => updateSeoLangData(seoActiveLanguage, 'ogTitle', e.target.value)}
                          placeholder={t.settings?.seoOgTitlePlaceholder || 'Title for social sharing'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.settings?.seoOgImage || 'OG Image URL'}</Label>
                        <Input
                          value={getSeoLangData(seoActiveLanguage).ogImage}
                          onChange={(e) => updateSeoLangData(seoActiveLanguage, 'ogImage', e.target.value)}
                          placeholder="https://example.com/og-image.png"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>{t.settings?.seoOgDescription || 'OG Description'}</Label>
                        <Textarea
                          value={getSeoLangData(seoActiveLanguage).ogDescription}
                          onChange={(e) => updateSeoLangData(seoActiveLanguage, 'ogDescription', e.target.value)}
                          placeholder={t.settings?.seoOgDescPlaceholder || 'Description for social sharing'}
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Twitter Card */}
                  <div className="border-t pt-4">
                    <h5 className="font-medium flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4" />
                      Twitter Card
                    </h5>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>{t.settings?.seoTwitterCard || 'Card Type'}</Label>
                        <select
                          value={getSeoLangData(seoActiveLanguage).twitterCard}
                          onChange={(e) => updateSeoLangData(seoActiveLanguage, 'twitterCard', e.target.value)}
                          className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                        >
                          <option value="summary">summary</option>
                          <option value="summary_large_image">summary_large_image</option>
                          <option value="app">app</option>
                          <option value="player">player</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t.settings?.seoTwitterSite || '@Username'}</Label>
                        <Input
                          value={getSeoLangData(seoActiveLanguage).twitterSite}
                          onChange={(e) => updateSeoLangData(seoActiveLanguage, 'twitterSite', e.target.value)}
                          placeholder="@yoursite"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.settings?.seoTwitterImage || 'Image URL'}</Label>
                        <Input
                          value={getSeoLangData(seoActiveLanguage).twitterImage}
                          onChange={(e) => updateSeoLangData(seoActiveLanguage, 'twitterImage', e.target.value)}
                          placeholder="https://example.com/twitter-image.png"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Head Tags */}
                  <div className="border-t pt-4">
                    <h5 className="font-medium flex items-center gap-2 mb-3">
                      <Code className="w-4 h-4" />
                      {t.settings?.seoCustomHeadTags || 'Custom Head Tags'}
                    </h5>
                    <Textarea
                      value={getSeoLangData(seoActiveLanguage).customHeadTags}
                      onChange={(e) => updateSeoLangData(seoActiveLanguage, 'customHeadTags', e.target.value)}
                      placeholder={'<!-- Google Analytics, structured data, etc. -->\n<script async src="https://..."></script>'}
                      rows={4}
                      className="resize-none font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.settings?.seoCustomHeadTagsHint || 'HTML tags injected into <head>. Use for analytics, verification, structured data, etc.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Canonical URL */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {t.settings?.seoCanonical || 'Canonical URL'}
                </CardTitle>
                <CardDescription>
                  {t.settings?.seoCanonicalDesc || 'The primary URL of your site. Used for canonical links and hreflang tags.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={seoSettings.canonicalUrl}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, canonicalUrl: e.target.value }))}
                  placeholder="https://example.com"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t.settings?.seoCanonicalHint || 'Leave empty to auto-detect. Include https:// without trailing slash.'}
                </p>
              </CardContent>
            </Card>

            {/* Robots.txt */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  robots.txt
                </CardTitle>
                <CardDescription>
                  {t.settings?.seoRobotsDesc || 'Control how search engines crawl your site. Use {{SITE_URL}} as placeholder for your site URL.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={seoSettings.robotsTxt}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, robotsTxt: e.target.value }))}
                  rows={10}
                  className="resize-none font-mono text-xs"
                />
                <div className="flex items-center gap-2 mt-2">
                  <Info className="w-3 h-3 text-muted-foreground" />
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {t.settings?.seoViewRobots || 'View live robots.txt'} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Sitemap */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  {t.settings?.seoSitemap || 'Sitemap'}
                  {seoSettings.sitemapEnabled && (
                    <Badge variant="secondary" className="ml-auto text-green-600">
                      {t.settings?.seoEnabled || 'Enabled'}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {t.settings?.seoSitemapDesc || 'Auto-generated sitemap with all public pages, KB articles, and hreflang links.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <p className="font-medium">{t.settings?.seoEnableSitemap || 'Enable Sitemap'}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.settings?.seoEnableSitemapDesc || 'Generate /sitemap.xml automatically with all pages and KB articles'}
                    </p>
                  </div>
                  <Switch
                    checked={seoSettings.sitemapEnabled}
                    onCheckedChange={(checked) => setSeoSettings(prev => ({ ...prev, sitemapEnabled: checked }))}
                  />
                </div>

                {seoSettings.sitemapEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>{t.settings?.seoSitemapCustomUrls || 'Custom URLs'}</Label>
                      <Textarea
                        value={seoSettings.sitemapCustomUrls}
                        onChange={(e) => setSeoSettings(prev => ({ ...prev, sitemapCustomUrls: e.target.value }))}
                        placeholder={'/about|0.8|monthly\n/pricing|0.7|weekly\n/blog|0.9|daily'}
                        rows={4}
                        className="resize-none font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.settings?.seoSitemapCustomUrlsHint || 'One URL per line. Format: /path|priority|changefreq. Static pages (/, /login, /register, /kb) and KB articles are included automatically.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Info className="w-3 h-3 text-muted-foreground" />
                      <a
                        href="/sitemap.xml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {t.settings?.seoViewSitemap || 'View live sitemap.xml'} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Security */}
          <TabsContent value="security" className="mt-6 space-y-6">
            {/* Email Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {t.settings?.emailVerification || 'Email Verification'}
                </CardTitle>
                <CardDescription>
                  {t.settings?.emailVerificationDesc || 'Configure whether users need to verify their email after registration'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <p className="font-medium">{t.settings?.enableEmailVerification || 'Enable Email Verification'}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.settings?.enableEmailVerificationDesc || 'When enabled, new users must verify their email address before accessing all features.'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailVerificationEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailVerificationEnabled: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cloudflare Turnstile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t.settings?.turnstile || 'Cloudflare Turnstile'}
                  {settings.turnstileEnabled && (
                    <span className="ml-auto text-xs font-normal px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      {enabledServicesCount} {t.settings?.servicesProtected || 'services protected'}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {t.settings?.turnstileDesc || 'Configure Turnstile captcha for spam protection'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <p className="font-medium">{t.settings?.enableTurnstile || 'Enable Turnstile'}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.settings?.enableTurnstileDesc || 'Require captcha verification for selected services'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.turnstileEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, turnstileEnabled: checked }))}
                  />
                </div>
                
                {settings.turnstileEnabled && (
                  <>
                    {/* API Keys */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="turnstileSiteKey">{t.settings?.turnstileSiteKey || 'Site Key'}</Label>
                        <Input
                          id="turnstileSiteKey"
                          value={settings.turnstileSiteKey}
                          onChange={(e) => setSettings(prev => ({ ...prev, turnstileSiteKey: e.target.value }))}
                          placeholder="0x4AAAAAAxxxxxxxxxx"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t.settings?.turnstileSiteKeyHint || 'Get this from Cloudflare Dashboard > Turnstile'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="turnstileSecretKey">{t.settings?.turnstileSecretKey || 'Secret Key'}</Label>
                        <div className="relative">
                          <Input
                            id="turnstileSecretKey"
                            type={showSecretKey ? "text" : "password"}
                            value={settings.turnstileSecretKey}
                            onChange={(e) => setSettings(prev => ({ ...prev, turnstileSecretKey: e.target.value }))}
                            placeholder="0x4AAAAAAxxxxxxxxxx"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.settings?.turnstileSecretKeyHint || 'Keep this secret. Used for server-side verification.'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Protected Services */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base">{t.settings?.turnstileServices || 'Protected Services'}</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t.settings?.turnstileServicesDesc || 'Select which services require captcha verification'}
                        </p>
                      </div>
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Email Verify - Always enabled */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="text-sm font-medium">{t.settings?.turnstileEmailVerify || 'Email Verification'}</p>
                              <p className="text-xs text-muted-foreground">{t.settings?.alwaysEnabled || 'Always enabled'}</p>
                            </div>
                          </div>
                          <Switch checked={true} disabled />
                        </div>
                        
                        {/* Create Hosting */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{t.settings?.turnstileCreateHosting || 'Create Hosting'}</p>
                            <p className="text-xs text-muted-foreground">{t.settings?.turnstileCreateHostingDesc || 'New hosting accounts'}</p>
                          </div>
                          <Switch 
                            checked={settings.turnstileServices?.createHosting || false}
                            onCheckedChange={(checked) => setSettings(prev => ({ 
                              ...prev, 
                              turnstileServices: { ...prev.turnstileServices, createHosting: checked } 
                            }))}
                          />
                        </div>
                        
                        {/* Hosting Settings */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{t.settings?.turnstileHostingSettings || 'Hosting Settings'}</p>
                            <p className="text-xs text-muted-foreground">{t.settings?.turnstileHostingSettingsDesc || 'Password, label, deactivate'}</p>
                          </div>
                          <Switch 
                            checked={settings.turnstileServices?.hostingSettings || false}
                            onCheckedChange={(checked) => setSettings(prev => ({ 
                              ...prev, 
                              turnstileServices: { ...prev.turnstileServices, hostingSettings: checked } 
                            }))}
                          />
                        </div>
                        
                        {/* Create SSL */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{t.settings?.turnstileCreateSSL || 'Request SSL'}</p>
                            <p className="text-xs text-muted-foreground">{t.settings?.turnstileCreateSSLDesc || 'SSL certificates'}</p>
                          </div>
                          <Switch 
                            checked={settings.turnstileServices?.createSSL || false}
                            onCheckedChange={(checked) => setSettings(prev => ({ 
                              ...prev, 
                              turnstileServices: { ...prev.turnstileServices, createSSL: checked } 
                            }))}
                          />
                        </div>
                        
                        {/* Create Ticket */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{t.settings?.turnstileCreateTicket || 'Create Ticket'}</p>
                            <p className="text-xs text-muted-foreground">{t.settings?.turnstileCreateTicketDesc || 'Support tickets'}</p>
                          </div>
                          <Switch 
                            checked={settings.turnstileServices?.createTicket || false}
                            onCheckedChange={(checked) => setSettings(prev => ({ 
                              ...prev, 
                              turnstileServices: { ...prev.turnstileServices, createTicket: checked } 
                            }))}
                          />
                        </div>
                        
                        {/* Reply Ticket */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{t.settings?.turnstileReplyTicket || 'Reply Ticket'}</p>
                            <p className="text-xs text-muted-foreground">{t.settings?.turnstileReplyTicketDesc || 'Ticket replies'}</p>
                          </div>
                          <Switch 
                            checked={settings.turnstileServices?.replyTicket || false}
                            onCheckedChange={(checked) => setSettings(prev => ({ 
                              ...prev, 
                              turnstileServices: { ...prev.turnstileServices, replyTicket: checked } 
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Integrations */}
          <TabsContent value="integrations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Puzzle className="w-5 h-5" />
                  {t.settings?.imgbbIntegration || 'ImgBB Integration'}
                </CardTitle>
                <CardDescription>
                  {t.settings?.imgbbIntegrationDesc || 'Configure ImgBB for image paste upload in the text editor. Users can paste screenshots (Ctrl+V) and they will be automatically uploaded to ImgBB.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="imgbbApiKey">{t.settings?.imgbbApiKey || 'ImgBB API Key'}</Label>
                  <Input
                    id="imgbbApiKey"
                    value={settings.imgbbApiKey || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, imgbbApiKey: e.target.value }))}
                    placeholder="e.g., a1b2c3d4e5f6789abcdef"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.settings?.imgbbApiKeyHint || 'Get your API Key from'}{' '}
                    <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      api.imgbb.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">{t.settings?.imgbbHowItWorks || 'How it works'}</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>{t.settings?.imgbbStep1 || 'Users take a screenshot or copy an image'}</li>
                      <li>{t.settings?.imgbbStep2 || 'Paste into the text editor with Ctrl+V'}</li>
                      <li>{t.settings?.imgbbStep3 || 'Image is automatically uploaded to ImgBB and embedded'}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Maintenance */}
          <TabsContent value="maintenance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t.settings?.maintenanceMode || 'Maintenance Mode'}
                  {settings.maintenanceMode && (
                    <span className="ml-auto text-xs font-normal px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                      {t.settings?.active || 'Active'}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {t.settings?.maintenanceModeDesc || 'Enable maintenance mode to temporarily disable the site for users'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <p className="font-medium">{t.settings?.enableMaintenance || 'Enable Maintenance Mode'}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.settings?.enableMaintenanceDesc || 'When enabled, users will see a maintenance message instead of the site.'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                </div>
                
                {settings.maintenanceMode && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maintenanceMessage">{t.settings?.maintenanceMessage || 'Maintenance Message'}</Label>
                      <Textarea
                        id="maintenanceMessage"
                        value={settings.maintenanceMessage}
                        onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                        placeholder="We are currently performing maintenance. Please check back soon."
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.settings?.maintenanceMessageHint || 'This message will be displayed to users during maintenance'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maintenanceAllowedIPs">{t.settings?.maintenanceAllowedIPs || 'Allowed IP Addresses'}</Label>
                      <Textarea
                        id="maintenanceAllowedIPs"
                        value={settings.maintenanceAllowedIPs}
                        onChange={(e) => setSettings(prev => ({ ...prev, maintenanceAllowedIPs: e.target.value }))}
                        placeholder="192.168.1.1, 10.0.0.1, 2001:db8::1"
                        rows={2}
                        className="resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.settings?.maintenanceAllowedIPsHint || 'Comma-separated list of IPs (IPv4 and IPv6) that can bypass maintenance mode'}
                      </p>
                    </div>
                    
                    {/* Warning */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <p className="font-medium">{t.settings?.maintenanceWarning || 'Warning'}</p>
                        <p className="mt-1">
                          {t.settings?.maintenanceWarningDesc || 'Make sure to add your IP address to the allowed list before enabling maintenance mode, otherwise you may lock yourself out.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminGeneralSettings;
