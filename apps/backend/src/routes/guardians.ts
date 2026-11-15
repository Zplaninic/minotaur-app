import { errorResponse, listGuardiansResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listGuardians } from "../services/guardians.js";

export const guardianRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    { schema: { response: { 200: listGuardiansResponse, 500: errorResponse } } },
    async () => listGuardians(app.db),
  );
};
