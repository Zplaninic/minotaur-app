import { createApiClient } from "@repo/shared/client";
import { env } from "../lib/env";
import { getSessionToken } from "../lib/sessionToken";

// The one API client of the app. Every request carries the session token, if there is one.
export const api = createApiClient(env.EXPO_PUBLIC_API_URL, {
  getHeaders: async (): Promise<Record<string, string>> => {
    const token = await getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});
