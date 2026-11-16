// The browser build: expo-secure-store has no web version. The language is
// not sensitive, so browser storage is fine.
const KEY = "minotaur.language";

export const readStoredLanguage = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const storeLanguage = (language: string): void => {
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // The choice then lasts only until the page is reloaded.
  }
};
