import { errorResponse, listGuardiansResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listGuardians } from "../services/guardians.js";

export const guardianRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Guardian"),
      schema: { response: { 200: listGuardiansResponse, 401: errorResponse, 403: errorResponse, 500: errorResponse } },
    },
    async () => listGuardians(app.db),
  );
};
