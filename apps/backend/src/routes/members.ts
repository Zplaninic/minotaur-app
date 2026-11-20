import {
  createMemberBody,
  importMembersBody,
  importMembersResponse,
  listMembersQuery,
  listMembersResponse,
  memberParams,
  memberResponse,
  setMemberNewBody,
  updateMemberBody,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../config.js";
import { AppError } from "../errors.js";
import { isoDateIn } from "../services/dates.js";
import { importMembers } from "../services/memberImport.js";
import {
  archiveMember,
  createMember,
  getMember,
  listMembers,
  setMemberNew,
  updateMember,
} from "../services/members.js";
import { actorOf, orgIdOf } from "./actor.js";
import { guardedErrorResponses } from "./responses.js";

const todayAtGym = (): string => isoDateIn(new Date(), config.GYM_TIME_ZONE);

export const memberRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Member"),
      schema: {
        querystring: listMembersQuery,
        response: { 200: listMembersResponse, ...guardedErrorResponses(400) },
      },
    },
    async (request) => {
      // Who has not paid is payment data.
      if (request.query.unpaid && !request.auth?.ability.can("read", "Subscription")) {
        throw new AppError("FORBIDDEN", 403, "Not allowed");
      }
      return listMembers(app.db, orgIdOf(request), request.query, todayAtGym());
    },
  );

  routes.post(
    "/",
    {
      // A new member may bring new guardians, so both abilities are needed.
      onRequest: [app.requireAbility("create", "Member"), app.requireAbility("create", "Guardian")],
      schema: {
        body: createMemberBody,
        response: { 201: memberResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await createMember(app.db, actorOf(request), request.body, todayAtGym())),
  );

  routes.post(
    "/import",
    {
      // Imported members bring guardians and this month's subscriptions, which only admins set.
      onRequest: [
        app.requireAbility("create", "Member"),
        app.requireAbility("create", "Guardian"),
        app.requireAbility("manage", "Subscription"),
      ],
      schema: {
        body: importMembersBody,
        response: { 200: importMembersResponse, ...guardedErrorResponses(400, 404) },
      },
    },
    async (request) => importMembers(app.db, actorOf(request), request.body, todayAtGym()),
  );

  routes.get(
    "/:id",
    {
      onRequest: app.requireAbility("read", "Member"),
      schema: {
        params: memberParams,
        response: { 200: memberResponse, ...guardedErrorResponses(404) },
      },
    },
    async (request) => getMember(app.db, orgIdOf(request), request.params.id),
  );

  routes.put(
    "/:id",
    {
      // The edit may bring new guardians, so both abilities are needed.
      onRequest: [app.requireAbility("update", "Member"), app.requireAbility("create", "Guardian")],
      schema: {
        params: memberParams,
        body: updateMemberBody,
        response: { 200: memberResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request) => updateMember(app.db, actorOf(request), request.params.id, request.body, todayAtGym()),
  );

  routes.put(
    "/:id/new",
    {
      onRequest: app.requireAbility("update", "Member"),
      schema: {
        params: memberParams,
        body: setMemberNewBody,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      await setMemberNew(app.db, actorOf(request), request.params.id, request.body.isNew);
      return reply.status(204).send();
    },
  );

  routes.delete(
    "/:id",
    {
      onRequest: app.requireAbility("delete", "Member"),
      schema: {
        params: memberParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request, reply) => {
      const now = new Date();
      await archiveMember(
        app.db,
        actorOf(request),
        request.params.id,
        now,
        isoDateIn(now, config.GYM_TIME_ZONE),
      );
      return reply.status(204).send();
    },
  );
};
