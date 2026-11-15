import { z } from "zod";
import { id } from "./common.js";
import { memberRole } from "./member.js";
import { email } from "./person.js";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

// Rules for a new password. Logging in only checks that a password was given,
// so a later change of these rules never locks anyone out.
export const newPassword = z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH);

// "cookie" for the web app (httpOnly cookie), "token" for the mobile app (bearer token).
export const sessionTransport = z.enum(["cookie", "token"]);
export type SessionTransport = z.infer<typeof sessionTransport>;

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
  transport: sessionTransport.default("cookie"),
});
export type LoginBody = z.infer<typeof loginBody>;
export type LoginInput = z.input<typeof loginBody>;

export const meResponse = z.object({
  memberId: id,
  name: z.string(),
  surname: z.string(),
  email: z.string(),
  role: memberRole,
});
export type MeResponse = z.infer<typeof meResponse>;

// token and expiresAt are only sent for the "token" transport.
export const loginResponse = z.object({
  me: meResponse,
  token: z.string().optional(),
  expiresAt: z.iso.datetime().optional(),
});
export type LoginResponse = z.infer<typeof loginResponse>;
