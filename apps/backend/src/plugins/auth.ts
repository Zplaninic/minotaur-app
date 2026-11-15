import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import type { MeResponse } from "@repo/shared";
import { defineAbilityFor, type Action, type AppAbility, type Subject } from "@repo/shared/auth";
import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from "fastify";
import fp from "fastify-plugin";
import { SESSION_COOKIE, validateSession } from "../auth/sessions.js";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import { toMeResponse } from "../services/auth.js";

export type AuthContext = {
  me: MeResponse;
  ability: AppAbility;
  token: string;
  transport: "cookie" | "token";
};

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
  interface FastifyInstance {
    // onRequest hook for routes about the logged-in member: 401 without a valid session.
    requireSession: onRequestAsyncHookHandler;
    // onRequest hook for every other route: 401 without a session, 403 without the ability.
    // onRequest runs before the body is parsed and validated, so a logged-out
    // caller learns nothing about what the route expects.
    requireAbility: (action: Action, subject: Subject) => onRequestAsyncHookHandler;
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const sessionCookieOptions = (expires: Date) =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production",
    path: "/",
    expires,
  }) as const;

const readToken = (request: FastifyRequest): { token: string; transport: "cookie" | "token" } | null => {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return { token: header.slice("Bearer ".length), transport: "token" };
  }
  const cookie = request.cookies[SESSION_COOKIE];
  return cookie ? { token: cookie, transport: "cookie" } : null;
};

const unauthorized = () => new AppError("UNAUTHORIZED", 401, "Log in first");

const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<AuthContext> => {
  const found = readToken(request);
  if (!found) {
    throw unauthorized();
  }

  // Cookies are sent by the browser on its own, so a data-changing request
  // with a cookie must come from our web app (protects against CSRF).
  if (found.transport === "cookie" && !SAFE_METHODS.has(request.method) && request.headers.origin !== config.WEB_ORIGIN) {
    throw new AppError("FORBIDDEN", 403, "Request origin not allowed");
  }

  const session = await validateSession(request.server.db, found.token, new Date());
  if (!session) {
    if (found.transport === "cookie") {
      reply.clearCookie(SESSION_COOKIE, { path: "/" });
    }
    throw unauthorized();
  }
  if (session.renewed && found.transport === "cookie") {
    reply.setCookie(SESSION_COOKIE, found.token, sessionCookieOptions(session.expiresAt));
  }

  const me = toMeResponse(session.member);
  const auth: AuthContext = {
    me,
    ability: defineAbilityFor({ memberId: me.memberId, role: me.role }),
    token: found.token,
    transport: found.transport,
  };
  request.auth = auth;
  return auth;
};

export const authPlugin = fp(async (app) => {
  await app.register(fastifyCookie);
  // Only routes that opt in are limited (the login route).
  await app.register(fastifyRateLimit, {
    global: false,
    errorResponseBuilder: () => new AppError("RATE_LIMITED", 429, "Too many attempts, try again later"),
  });

  app.decorateRequest("auth", null);

  app.decorate("requireSession", async function requireSession(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
  });

  app.decorate("requireAbility", (action: Action, subject: Subject) =>
    async function requireAbility(request: FastifyRequest, reply: FastifyReply) {
      const auth = await authenticate(request, reply);
      if (!auth.ability.can(action, subject)) {
        throw new AppError("FORBIDDEN", 403, "Not allowed");
      }
    },
  );
});
