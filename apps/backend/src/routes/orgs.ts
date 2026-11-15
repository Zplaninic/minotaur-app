import { errorResponse, listOrgsResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listOrgs } from "../services/orgs.js";

export const orgRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Org"),
      schema: { response: { 200: listOrgsResponse, 401: errorResponse, 403: errorResponse, 500: errorResponse } },
    },
    async () => listOrgs(app.db),
  );
};
