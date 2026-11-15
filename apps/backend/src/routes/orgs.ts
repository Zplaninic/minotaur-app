import { errorResponse, listOrgsResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listOrgs } from "../services/orgs.js";

export const orgRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    { schema: { response: { 200: listOrgsResponse, 500: errorResponse } } },
    async () => listOrgs(app.db),
  );
};
