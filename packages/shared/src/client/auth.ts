import { z } from "zod";
import { loginResponse, meResponse, type LoginBody, type LoginResponse, type MeResponse } from "../types/auth.js";
import { ApiError, type ApiClient } from "./apiClient.js";

export const authKeys = {
  me: () => ["me"] as const,
};

// The logged-in member, or null when logged out.
export const fetchMe = async (api: ApiClient): Promise<MeResponse | null> => {
  try {
    return await api.fetch("/me", meResponse);
  } catch (error) {
    if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
      return null;
    }
    throw error;
  }
};

// Query options for TanStack Query: useQuery(authQueries.me(api)).
export const authQueries = {
  me: (api: ApiClient) => ({
    queryKey: authKeys.me(),
    queryFn: () => fetchMe(api),
  }),
};

export const login = (api: ApiClient, body: LoginBody): Promise<LoginResponse> =>
  api.fetch("/auth/login", loginResponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// The server answers 204 with no body.
export const logout = (api: ApiClient): Promise<undefined> =>
  api.fetch("/auth/logout", z.undefined(), { method: "POST" });
