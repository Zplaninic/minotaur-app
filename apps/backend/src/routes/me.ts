import { meResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError } from "../errors.js";
import { errorResponses } from "./responses.js";

export const meRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireSession,
      schema: { response: { 200: meResponse, ...errorResponses(401, 500) } },
    },
    async (request) => {
      if (!request.auth) {
        throw new AppError("UNAUTHORIZED", 401, "Log in first");
      }
      return request.auth.me;
    },
  );
};
