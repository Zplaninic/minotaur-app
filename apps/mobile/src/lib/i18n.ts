import { getLocales } from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { readStoredLanguage, storeLanguage } from "./languageStore";
import { en } from "./locales/en";
import { hr } from "./locales/hr";

export const LANGUAGES = ["en", "hr"] as const;
export type Language = (typeof LANGUAGES)[number];

const DEFAULT_LANGUAGE: Language = "en";

export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((language) => language === value);

// The first supported language in the device's preference list, e.g. "hr-HR" → "hr".
export const pickLanguage = (preferred: readonly string[]): Language =>
  preferred.map((tag) => tag.toLowerCase().split("-")[0]).find(isLanguage) ?? DEFAULT_LANGUAGE;

const initialLanguage = (): Language => {
  const stored = readStoredLanguage();
  return isLanguage(stored) ? stored : pickLanguage(getLocales().map((locale) => locale.languageTag));
};

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hr: { translation: hr } },
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES,
  // Keys are flat strings like "home.members", not nested objects.
  keySeparator: false,
  nsSeparator: false,
  // React escapes text itself. Placeholders are {name}, as in the messages.
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  initAsync: false,
});

export const currentLanguage = (): Language => (isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE);

export const setLanguage = (language: Language): void => {
  storeLanguage(language);
  void i18n.changeLanguage(language);
};
