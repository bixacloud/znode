import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

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

interface SEOData {
  languages: Record<string, SEOLanguageData>;
  canonicalUrl: string;
}

interface SiteSettings {
  siteName: string;
  siteSlogan: string;
  siteLogo: string;
  siteFavicon: string;
  emailVerificationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  imgbbApiKey: string;
}

interface SiteContextType {
  settings: SiteSettings;
  seo: SEOData;
  isLoading: boolean;
  setPageTitle: (title: string) => void;
  refetch: () => void;
  updateSEOMeta: (language: string) => void;
}

const defaultSettings: SiteSettings = {
  siteName: 'ZNode',
  siteSlogan: 'Free Web Hosting',
  siteLogo: '',
  siteFavicon: '',
  emailVerificationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
  turnstileEnabled: false,
  turnstileSiteKey: '',
  imgbbApiKey: '',
};

const defaultSEO: SEOData = {
  languages: {},
  canonicalUrl: '',
};

const SiteContext = createContext<SiteContextType>({
  settings: defaultSettings,
  seo: defaultSEO,
  isLoading: true,
  setPageTitle: () => {},
  refetch: () => {},
  updateSEOMeta: () => {},
});

export const useSite = () => useContext(SiteContext);

interface SiteProviderProps {
  children: ReactNode;
}

// Helper to set/update a meta tag
const setMetaTag = (attr: string, key: string, content: string) => {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (el) {
    el.content = content;
  } else {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.content = content;
    document.head.appendChild(el);
  }
};

// Helper to set canonical link
const setCanonicalLink = (url: string) => {
  if (!url) return;
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (el) {
    el.href = url;
  } else {
    el = document.createElement('link');
    el.rel = 'canonical';
    el.href = url;
    document.head.appendChild(el);
  }
};

// Helper to inject hreflang links
const setHreflangLinks = (languages: Record<string, SEOLanguageData>, canonicalUrl: string) => {
  // Remove existing hreflang links
  document.querySelectorAll('link[hreflang]').forEach(el => el.remove());

  const langs = Object.keys(languages);
  if (langs.length <= 1) return;

  const baseUrl = canonicalUrl || window.location.origin;
  const path = window.location.pathname;

  for (const lang of langs) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = lang;
    link.href = `${baseUrl}${path}?lang=${lang}`;
    document.head.appendChild(link);
  }

  // x-default
  const defaultLink = document.createElement('link');
  defaultLink.rel = 'alternate';
  defaultLink.hreflang = 'x-default';
  defaultLink.href = `${baseUrl}${path}`;
  document.head.appendChild(defaultLink);
};

// Helper to inject custom head tags
const injectCustomHeadTags = (html: string) => {
  // Remove previous custom tags
  document.querySelectorAll('[data-seo-custom]').forEach(el => el.remove());
  if (!html) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const nodes = wrapper.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.nodeType === 1) {
      (node as HTMLElement).setAttribute('data-seo-custom', 'true');
      document.head.appendChild(node.cloneNode(true));
    }
  }
};

export const SiteProvider = ({ children }: SiteProviderProps) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [seo, setSeo] = useState<SEOData>(defaultSEO);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const [settingsRes, seoRes] = await Promise.all([
        fetch(`${API_URL}/api/settings/general/public`),
        fetch(`${API_URL}/api/settings/seo/public`),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({ ...defaultSettings, ...data });
        if (data.siteFavicon) {
          updateFavicon(data.siteFavicon);
        }
      }

      if (seoRes.ok) {
        const seoData = await seoRes.json();
        const newSeo = { languages: seoData.languages || {}, canonicalUrl: seoData.canonicalUrl || '' };
        setSeo(newSeo);

        // Apply SEO meta tags immediately with current language
        const currentLang = document.documentElement.lang || 'en';
        const langData = newSeo.languages[currentLang] || newSeo.languages['en'] || Object.values(newSeo.languages)[0];
        if (langData) {
          if (langData.title) document.title = langData.title;
          if (langData.description) setMetaTag('name', 'description', langData.description);
          if (langData.keywords) setMetaTag('name', 'keywords', langData.keywords);
          if (langData.ogTitle) setMetaTag('property', 'og:title', langData.ogTitle);
          if (langData.ogDescription) setMetaTag('property', 'og:description', langData.ogDescription);
          if (langData.ogImage) setMetaTag('property', 'og:image', langData.ogImage);
          setMetaTag('property', 'og:type', 'website');
          if (langData.twitterCard) setMetaTag('name', 'twitter:card', langData.twitterCard);
          if (langData.twitterSite) setMetaTag('name', 'twitter:site', langData.twitterSite);
          if (langData.twitterImage) setMetaTag('name', 'twitter:image', langData.twitterImage);
          if (newSeo.canonicalUrl) setCanonicalLink(newSeo.canonicalUrl + window.location.pathname);
          setHreflangLinks(newSeo.languages, newSeo.canonicalUrl);
          if (langData.customHeadTags) injectCustomHeadTags(langData.customHeadTags);
        }
      }
    } catch (error) {
      console.error('Failed to fetch site settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFavicon = (faviconUrl: string) => {
    const existingFavicons = document.querySelectorAll("link[rel*='icon']");
    existingFavicons.forEach(el => el.remove());
    
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
  };

  const updateSEOMeta = useCallback((language: string) => {
    const langData = seo.languages[language] || seo.languages['en'] || Object.values(seo.languages)[0];
    if (!langData) return;

    // Update page title from SEO data
    if (langData.title) {
      document.title = langData.title;
    }

    // Basic meta tags
    if (langData.description) setMetaTag('name', 'description', langData.description);
    if (langData.keywords) setMetaTag('name', 'keywords', langData.keywords);

    // Open Graph
    if (langData.ogTitle) setMetaTag('property', 'og:title', langData.ogTitle);
    if (langData.ogDescription) setMetaTag('property', 'og:description', langData.ogDescription);
    if (langData.ogImage) setMetaTag('property', 'og:image', langData.ogImage);
    setMetaTag('property', 'og:type', 'website');

    // Twitter
    if (langData.twitterCard) setMetaTag('name', 'twitter:card', langData.twitterCard);
    if (langData.twitterSite) setMetaTag('name', 'twitter:site', langData.twitterSite);
    if (langData.twitterImage) setMetaTag('name', 'twitter:image', langData.twitterImage);

    // Canonical
    if (seo.canonicalUrl) {
      setCanonicalLink(seo.canonicalUrl + window.location.pathname);
    }

    // Hreflang
    setHreflangLinks(seo.languages, seo.canonicalUrl);

    // Custom head tags
    if (langData.customHeadTags) {
      injectCustomHeadTags(langData.customHeadTags);
    }

    // Update html lang attribute
    document.documentElement.lang = language;
  }, [seo]);

  const setPageTitle = (pageTitle: string) => {
    if (pageTitle) {
      document.title = `${pageTitle} | ${settings.siteName}`;
    } else {
      document.title = settings.siteName;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update default title when settings change
  useEffect(() => {
    if (!isLoading) {
      document.title = settings.siteName;
    }
  }, [settings.siteName, isLoading]);

  return (
    <SiteContext.Provider value={{ 
      settings, 
      seo,
      isLoading, 
      setPageTitle,
      refetch: fetchSettings,
      updateSEOMeta,
    }}>
      {children}
    </SiteContext.Provider>
  );
};

// Custom hook for setting page title
export const usePageTitle = (title: string) => {
  const { setPageTitle, settings } = useSite();
  
  useEffect(() => {
    setPageTitle(title);
    
    // Cleanup: reset to site name when unmounting
    return () => {
      document.title = settings.siteName;
    };
  }, [title, setPageTitle, settings.siteName]);
};

export default SiteContext;
