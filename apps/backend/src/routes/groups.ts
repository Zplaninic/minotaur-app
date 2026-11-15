import { createGroupBody, errorResponse, groupResponse, listGroupsResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createGroup, listGroups } from "../services/groups.js";

export const groupRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Group"),
      schema: { response: { 200: listGroupsResponse, 401: errorResponse, 403: errorResponse, 500: errorResponse } },
    },
    async () => listGroups(app.db),
  );

  routes.post(
    "/",
    {
      onRequest: app.requireAbility("create", "Group"),
      schema: {
        body: createGroupBody,
        response: {
          201: groupResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => reply.status(201).send(await createGroup(app.db, request.body)),
  );
};
