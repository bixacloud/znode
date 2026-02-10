import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language, TranslationType, availableLanguages } from "@/i18n/translations";
import { useSite } from "@/contexts/SiteContext";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationType;
  availableLanguages: typeof availableLanguages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "freehost-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isInitialized, setIsInitialized] = useState(false);
  const { updateSEOMeta } = useSite();

  // Initialize language from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const validLanguages = Object.keys(translations) as Language[];
      if (stored && validLanguages.includes(stored as Language)) {
        setLanguageState(stored as Language);
      } else {
        // Detect browser language
        const browserLang = navigator.language.toLowerCase();
        const detected = validLanguages.find(lang => browserLang.startsWith(lang));
        if (detected) {
          setLanguageState(detected);
        }
      }
    } catch (e) {
      console.warn("Failed to load language preference:", e);
    }
    setIsInitialized(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    // Update SEO meta tags when language changes
    updateSEOMeta(language);
  }, [language, updateSEOMeta]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language] as TranslationType,
    availableLanguages,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
