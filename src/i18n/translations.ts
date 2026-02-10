import en from "./locales/en.json";
import vi from "./locales/vi.json";
import zh from "./locales/zh.json";
import fil from "./locales/fil.json";

export const translations = {
  en,
  vi,
  zh,
  fil,
} as const;

export type Language = keyof typeof translations;
export type TranslationType = typeof en;

// List of available languages with metadata
export const availableLanguages: {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "fil", name: "Filipino", nativeName: "Filipino", flag: "🇵🇭" },
];
