import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { hr } from "./locales/hr";

export const LANGUAGES = ["en", "hr"] as const;
export type Language = (typeof LANGUAGES)[number];

const DEFAULT_LANGUAGE: Language = "en";
const STORAGE_KEY = "minotaur.language";

export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((language) => language === value);

// The first supported language in the browser's preference list, e.g. "hr-HR" → "hr".
export const pickLanguage = (preferred: readonly string[]): Language =>
  preferred.map((tag) => tag.toLowerCase().split("-")[0]).find(isLanguage) ?? DEFAULT_LANGUAGE;

// Storage can be unavailable (private mode, blocked site data); the language
// then falls back to the browser's.
const readStoredLanguage = (): Language | undefined => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
};

const storeLanguage = (language: Language): void => {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The choice then lasts only until the page is reloaded.
  }
};

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hr: { translation: hr } },
  lng: readStoredLanguage() ?? pickLanguage(navigator.languages),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES,
  // Keys are flat strings like "nav.members", not nested objects.
  keySeparator: false,
  nsSeparator: false,
  // React escapes text itself. Placeholders are {name}, as in the messages.
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  initAsync: false,
});

const syncDocumentLanguage = (language: string): void => {
  document.documentElement.lang = language;
};
syncDocumentLanguage(i18n.language);
i18n.on("languageChanged", syncDocumentLanguage);

export const currentLanguage = (): Language => (isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE);

export const setLanguage = (language: Language): void => {
  storeLanguage(language);
  void i18n.changeLanguage(language);
};
