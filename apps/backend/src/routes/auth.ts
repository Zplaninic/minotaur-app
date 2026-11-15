import { errorResponse, loginBody, loginResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { deleteSession, SESSION_COOKIE } from "../auth/sessions.js";
import { sessionCookieOptions } from "../plugins/auth.js";
import { login } from "../services/auth.js";

// Brute-force protection for the login route, per client IP address.
const LOGIN_RATE_LIMIT = { max: 5, timeWindow: "1 minute" };

export const authRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.post(
    "/login",
    {
      config: { rateLimit: LOGIN_RATE_LIMIT },
      schema: {
        body: loginBody,
        response: { 200: loginResponse, 400: errorResponse, 401: errorResponse, 429: errorResponse, 500: errorResponse },
      },
    },
    async (request, reply) => {
      const result = await login(app.db, request.body, new Date());
      if (request.body.transport === "token") {
        return { me: result.me, token: result.token, expiresAt: result.expiresAt.toISOString() };
      }
      reply.setCookie(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
      return { me: result.me };
    },
  );

  routes.post(
    "/logout",
    {
      onRequest: app.requireSession,
      schema: { response: { 204: z.undefined(), 401: errorResponse, 403: errorResponse, 500: errorResponse } },
    },
    async (request, reply) => {
      if (request.auth) {
        await deleteSession(app.db, request.auth.token);
      }
      reply.clearCookie(SESSION_COOKIE, { path: "/" });
      return reply.status(204).send();
    },
  );
};
