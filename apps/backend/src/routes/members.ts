import {
  createMemberBody,
  errorResponse,
  listMembersQuery,
  listMembersResponse,
  memberParams,
  memberResponse,
  updateMemberBody,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../config.js";
import { isoDateIn } from "../services/attendance.js";
import { archiveMember, createMember, getMember, listMembers, updateMember } from "../services/members.js";

export const memberRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Member"),
      schema: {
        querystring: listMembersQuery,
        response: { 200: listMembersResponse, 400: errorResponse, 401: errorResponse, 403: errorResponse, 500: errorResponse },
      },
    },
    async (request) => listMembers(app.db, request.query),
  );

  routes.post(
    "/",
    {
      // A new member may bring new guardians, so both abilities are needed.
      onRequest: [app.requireAbility("create", "Member"), app.requireAbility("create", "Guardian")],
      schema: {
        body: createMemberBody,
        response: {
          201: memberResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => reply.status(201).send(await createMember(app.db, request.body, new Date())),
  );

  routes.get(
    "/:id",
    {
      onRequest: app.requireAbility("read", "Member"),
      schema: {
        params: memberParams,
        response: { 200: memberResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse },
      },
    },
    async (request) => getMember(app.db, request.params.id),
  );

  routes.put(
    "/:id",
    {
      // The edit may bring new guardians, so both abilities are needed.
      onRequest: [app.requireAbility("update", "Member"), app.requireAbility("create", "Guardian")],
      schema: {
        params: memberParams,
        body: updateMemberBody,
        response: {
          200: memberResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request) => updateMember(app.db, request.params.id, request.body, new Date()),
  );

  routes.delete(
    "/:id",
    {
      onRequest: app.requireAbility("delete", "Member"),
      schema: {
        params: memberParams,
        response: {
          204: z.undefined(),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const now = new Date();
      await archiveMember(app.db, request.params.id, now, isoDateIn(now, config.GYM_TIME_ZONE));
      return reply.status(204).send();
    },
  );
};
