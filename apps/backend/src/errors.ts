import type { ErrorCode } from "@repo/shared";

// Services throw this. The error handler plugin turns it into the shared errorResponse.
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
