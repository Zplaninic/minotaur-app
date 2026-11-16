import {
  createGroupBody,
  errorResponse,
  groupMemberParams,
  groupParams,
  groupResponse,
  listGroupMembersResponse,
  listGroupsResponse,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  addGroupMember,
  createGroup,
  getGroup,
  listGroupMembers,
  listGroups,
  removeGroupMember,
} from "../services/groups.js";

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

  routes.get(
    "/:id",
    {
      onRequest: app.requireAbility("read", "Group"),
      schema: {
        params: groupParams,
        response: { 200: groupResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse },
      },
    },
    async (request) => getGroup(app.db, request.params.id),
  );

  routes.get(
    "/:id/members",
    {
      onRequest: app.requireAbility("read", "Group"),
      schema: {
        params: groupParams,
        response: {
          200: listGroupMembersResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request) => listGroupMembers(app.db, request.params.id),
  );

  routes.put(
    "/:id/members/:memberId",
    {
      onRequest: app.requireAbility("update", "Group"),
      schema: {
        params: groupMemberParams,
        response: {
          204: z.undefined(),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      await addGroupMember(app.db, request.params.id, request.params.memberId);
      return reply.status(204).send();
    },
  );

  routes.delete(
    "/:id/members/:memberId",
    {
      onRequest: app.requireAbility("update", "Group"),
      schema: {
        params: groupMemberParams,
        response: { 204: z.undefined(), 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse },
      },
    },
    async (request, reply) => {
      await removeGroupMember(app.db, request.params.id, request.params.memberId);
      return reply.status(204).send();
    },
  );
};
