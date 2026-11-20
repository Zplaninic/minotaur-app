import {
  createGroupBody,
  groupMemberParams,
  groupParams,
  groupResponse,
  listGroupMembersResponse,
  listGroupsResponse,
  updateGroupBody,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../config.js";
import { isoDateIn } from "../services/dates.js";
import {
  addGroupMember,
  archiveGroup,
  createGroup,
  getGroup,
  listGroupMembers,
  listGroups,
  removeGroupMember,
  updateGroup,
} from "../services/groups.js";
import { actorOf } from "./actor.js";
import { guardedErrorResponses } from "./responses.js";

export const groupRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Group"),
      schema: { response: { 200: listGroupsResponse, ...guardedErrorResponses() } },
    },
    async () => listGroups(app.db),
  );

  routes.post(
    "/",
    {
      onRequest: app.requireAbility("create", "Group"),
      schema: {
        body: createGroupBody,
        response: { 201: groupResponse, ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => reply.status(201).send(await createGroup(app.db, actorOf(request), request.body)),
  );

  routes.get(
    "/:id",
    {
      onRequest: app.requireAbility("read", "Group"),
      schema: {
        params: groupParams,
        response: { 200: groupResponse, ...guardedErrorResponses(404) },
      },
    },
    async (request) => getGroup(app.db, request.params.id),
  );

  routes.put(
    "/:id",
    {
      onRequest: app.requireAbility("update", "Group"),
      schema: {
        params: groupParams,
        body: updateGroupBody,
        response: { 200: groupResponse, ...guardedErrorResponses(400, 404) },
      },
    },
    async (request) => updateGroup(app.db, actorOf(request), request.params.id, request.body),
  );

  routes.delete(
    "/:id",
    {
      onRequest: app.requireAbility("delete", "Group"),
      schema: {
        params: groupParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      await archiveGroup(app.db, actorOf(request), request.params.id, new Date());
      return reply.status(204).send();
    },
  );

  routes.get(
    "/:id/members",
    {
      onRequest: app.requireAbility("read", "Group"),
      schema: {
        params: groupParams,
        response: { 200: listGroupMembersResponse, ...guardedErrorResponses(404) },
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
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      await addGroupMember(
        app.db,
        actorOf(request),
        request.params.id,
        request.params.memberId,
        isoDateIn(new Date(), config.GYM_TIME_ZONE),
      );
      return reply.status(204).send();
    },
  );

  routes.delete(
    "/:id/members/:memberId",
    {
      onRequest: app.requireAbility("update", "Group"),
      schema: {
        params: groupMemberParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(404) },
      },
    },
    async (request, reply) => {
      await removeGroupMember(
        app.db,
        actorOf(request),
        request.params.id,
        request.params.memberId,
        isoDateIn(new Date(), config.GYM_TIME_ZONE),
      );
      return reply.status(204).send();
    },
  );
};
