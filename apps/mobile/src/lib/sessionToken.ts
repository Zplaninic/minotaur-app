import * as SecureStore from "expo-secure-store";

const KEY = "minotaur.session-token";

// Kept in memory after the first read, so not every request touches the keychain.
let cached: string | null | undefined;

export const getSessionToken = async (): Promise<string | null> => {
  if (cached === undefined) {
    cached = await SecureStore.getItemAsync(KEY);
  }
  return cached;
};

export const saveSessionToken = async (token: string): Promise<void> => {
  cached = token;
  await SecureStore.setItemAsync(KEY, token);
};

export const clearSessionToken = async (): Promise<void> => {
  cached = null;
  await SecureStore.deleteItemAsync(KEY);
};
