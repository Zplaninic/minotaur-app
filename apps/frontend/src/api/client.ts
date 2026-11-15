import { errorResponse, type ErrorCode } from "@repo/shared";
import type { z } from "zod";
import { env } from "../lib/env";

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

export const apiFetch = async <Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  init: RequestInit = {},
): Promise<z.infer<Schema>> => {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_URL}${path}`, { ...init, headers });
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
};
