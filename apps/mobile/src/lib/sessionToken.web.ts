// The browser build: expo-secure-store has no web version, so the token is
// kept in memory only. It is never written to browser storage, which any
// script on the page could read; reloading the page logs out.
let token: string | null = null;

export const getSessionToken = async (): Promise<string | null> => token;

export const saveSessionToken = async (value: string): Promise<void> => {
  token = value;
};

export const clearSessionToken = async (): Promise<void> => {
  token = null;
};
