import type { z } from "zod";
import { errorResponse, type ErrorCode } from "../types/common.js";

export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "UNEXPECTED_RESPONSE";

export class ApiError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number | undefined;

  constructor(code: ClientErrorCode, status?: number) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export const toErrorCode = (error: unknown): ClientErrorCode =>
  error instanceof ApiError ? error.code : "UNEXPECTED_RESPONSE";

const MAX_QUERY_RETRIES = 3;

// For TanStack Query's `retry`: only a failed connection is worth another try.
// An answer from the server (not found, not allowed, logged out) stays the same.
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean =>
  toErrorCode(error) === "NETWORK_ERROR" && failureCount < MAX_QUERY_RETRIES;

export type ApiClient = {
  fetch: <Schema extends z.ZodType>(path: string, schema: Schema, init?: RequestInit) => Promise<z.infer<Schema>>;
};

export type ApiClientOptions = {
  // Extra headers for every request, e.g. the mobile app's bearer token.
  getHeaders?: () => Promise<Record<string, string>>;
};

// Every response is parsed with its shared schema; every failure becomes an ApiError.
export const createApiClient = (baseUrl: string, options: ApiClientOptions = {}): ApiClient => ({
  fetch: async (path, schema, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    for (const [name, value] of Object.entries((await options.getHeaders?.()) ?? {})) {
      headers.set(name, value);
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new ApiError("NETWORK_ERROR");
    }

    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const parsedError = errorResponse.safeParse(body);
      throw new ApiError(parsedError.success ? parsedError.data.code : "UNEXPECTED_RESPONSE", response.status);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("UNEXPECTED_RESPONSE", response.status);
    }
    return parsed.data;
  },
});
