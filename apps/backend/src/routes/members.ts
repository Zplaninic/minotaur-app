import { createMemberBody, errorResponse, listMembersQuery, listMembersResponse, memberResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createMember, listMembers } from "../services/members.js";

export const memberRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      schema: {
        querystring: listMembersQuery,
        response: { 200: listMembersResponse, 400: errorResponse, 500: errorResponse },
      },
    },
    async (request) => listMembers(app.db, request.query),
  );

  routes.post(
    "/",
    {
      schema: {
        body: createMemberBody,
        response: {
          201: memberResponse,
          400: errorResponse,
          404: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => reply.status(201).send(await createMember(app.db, request.body, new Date())),
  );
};
