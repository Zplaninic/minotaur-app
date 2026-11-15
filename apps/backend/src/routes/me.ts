import { errorResponse, meResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError } from "../errors.js";

export const meRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireSession,
      schema: { response: { 200: meResponse, 401: errorResponse, 500: errorResponse } },
    },
    async (request) => {
      if (!request.auth) {
        throw new AppError("UNAUTHORIZED", 401, "Log in first");
      }
      return request.auth.me;
    },
  );
};
