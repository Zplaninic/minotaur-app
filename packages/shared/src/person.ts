import { z } from "zod";

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;

export const personName = z.string().trim().min(1).max(MAX_NAME_LENGTH);

export const email = z.email().max(MAX_EMAIL_LENGTH);

// Digits with an optional leading +, spaces, dashes and slashes allowed.
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 /-]{4,18}[0-9]$/);
