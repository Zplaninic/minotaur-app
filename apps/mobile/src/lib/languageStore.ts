import * as SecureStore from "expo-secure-store";

const KEY = "minotaur.language";

// Synchronous, so the stored language is known before the first render.
// A failed read or write only means the device language is used.
export const readStoredLanguage = (): string | null => {
  try {
    return SecureStore.getItem(KEY);
  } catch {
    return null;
  }
};

export const storeLanguage = (language: string): void => {
  try {
    SecureStore.setItem(KEY, language);
  } catch {
    // The choice then lasts only until the app restarts.
  }
};
