import { listGuardiansResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listGuardians } from "../services/guardians.js";
import { orgIdOf } from "./actor.js";
import { guardedErrorResponses } from "./responses.js";

export const guardianRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Guardian"),
      schema: { response: { 200: listGuardiansResponse, ...guardedErrorResponses() } },
    },
    async (request) => listGuardians(app.db, orgIdOf(request)),
  );
};
