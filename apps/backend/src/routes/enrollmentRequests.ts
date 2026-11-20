import {
  acceptEnrollmentChildBody,
  createEnrollmentRequestBody,
  enrollmentChildParams,
  enrollmentRequestParams,
  enrollmentRequestResponse,
  listEnrollmentRequestsQuery,
  listEnrollmentRequestsResponse,
  setEnrollmentChildGroupBody,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../config.js";
import { isoDateIn } from "../services/dates.js";
import {
  acceptEnrollmentChild,
  createEnrollmentRequest,
  deleteEnrollmentRequest,
  listEnrollmentRequests,
  rejectEnrollmentChild,
  reopenEnrollmentChild,
  setEnrollmentChildGroup,
} from "../services/enrollmentRequests.js";
import { actorOf } from "./actor.js";
import { guardedErrorResponses } from "./responses.js";

export const enrollmentRequestRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "EnrollmentRequest"),
      schema: {
        querystring: listEnrollmentRequestsQuery,
        response: { 200: listEnrollmentRequestsResponse, ...guardedErrorResponses(400) },
      },
    },
    async (request) => listEnrollmentRequests(app.db, request.query),
  );

  routes.post(
    "/",
    {
      onRequest: app.requireAbility("create", "EnrollmentRequest"),
      schema: {
        body: createEnrollmentRequestBody,
        response: { 201: enrollmentRequestResponse, ...guardedErrorResponses(400) },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await createEnrollmentRequest(app.db, actorOf(request), request.body)),
  );

  routes.put(
    "/:id/children/:childId/group",
    {
      onRequest: app.requireAbility("update", "EnrollmentRequest"),
      schema: {
        params: enrollmentChildParams,
        body: setEnrollmentChildGroupBody,
        response: { 200: enrollmentRequestResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request) =>
      setEnrollmentChildGroup(
        app.db,
        actorOf(request),
        request.params.id,
        request.params.childId,
        request.body.groupId,
      ),
  );

  routes.post(
    "/:id/children/:childId/accept",
    {
      onRequest: app.requireAbility("update", "EnrollmentRequest"),
      schema: {
        params: enrollmentChildParams,
        body: acceptEnrollmentChildBody,
        response: { 200: enrollmentRequestResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request) =>
      acceptEnrollmentChild(
        app.db,
        actorOf(request),
        request.params.id,
        request.params.childId,
        request.body,
        isoDateIn(new Date(), config.GYM_TIME_ZONE),
      ),
  );

  routes.post(
    "/:id/children/:childId/reject",
    {
      onRequest: app.requireAbility("update", "EnrollmentRequest"),
      schema: {
        params: enrollmentChildParams,
        response: { 200: enrollmentRequestResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request) => rejectEnrollmentChild(app.db, actorOf(request), request.params.id, request.params.childId),
  );

  routes.post(
    "/:id/children/:childId/reopen",
    {
      onRequest: app.requireAbility("update", "EnrollmentRequest"),
      schema: {
        params: enrollmentChildParams,
        response: { 200: enrollmentRequestResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request) => reopenEnrollmentChild(app.db, actorOf(request), request.params.id, request.params.childId),
  );

  routes.delete(
    "/:id",
    {
      onRequest: app.requireAbility("delete", "EnrollmentRequest"),
      schema: {
        params: enrollmentRequestParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      await deleteEnrollmentRequest(app.db, actorOf(request), request.params.id);
      return reply.status(204).send();
    },
  );
};
