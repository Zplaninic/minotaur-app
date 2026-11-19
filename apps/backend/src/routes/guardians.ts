import { listGuardiansResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listGuardians } from "../services/guardians.js";
import { guardedErrorResponses } from "./responses.js";

export const guardianRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Guardian"),
      schema: { response: { 200: listGuardiansResponse, ...guardedErrorResponses() } },
    },
    async () => listGuardians(app.db),
  );
};
