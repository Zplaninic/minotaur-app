import { listAuditEventsQuery, listAuditEventsResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { listAuditEvents } from "../services/audit.js";
import { orgIdOf } from "./actor.js";
import { guardedErrorResponses } from "./responses.js";

export const auditEventRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "AuditEvent"),
      schema: {
        querystring: listAuditEventsQuery,
        response: { 200: listAuditEventsResponse, ...guardedErrorResponses(400) },
      },
    },
    async (request) => listAuditEvents(app.db, orgIdOf(request), request.query),
  );
};
