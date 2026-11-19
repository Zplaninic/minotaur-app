import { listOrgsResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listOrgs } from "../services/orgs.js";
import { guardedErrorResponses } from "./responses.js";

export const orgRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Org"),
      schema: { response: { 200: listOrgsResponse, ...guardedErrorResponses() } },
    },
    async () => listOrgs(app.db),
  );
};
