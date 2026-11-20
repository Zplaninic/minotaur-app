import {
  addMonthMemberBody,
  attendanceParams,
  createMonthSessionsBody,
  createTrainingSessionBody,
  groupAttendanceResponse,
  groupParams,
  monthMemberParams,
  monthQuery,
  setMonthCommentBody,
  setMonthPaidBody,
  setMonthSubscriptionBody,
  trainingSessionParams,
  trainingSessionResponse,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../config.js";
import {
  addMonthMember,
  addTrainingSession,
  createMonthSessions,
  deleteTrainingSession,
  getGroupAttendance,
  markAttendance,
  removeMonthMember,
  setMonthComment,
  setMonthPaid,
  setMonthSubscription,
  unmarkAttendance,
} from "../services/attendance.js";
import { isoDateIn } from "../services/dates.js";
import { actorOf } from "./actor.js";
import { guardedErrorResponses } from "./responses.js";

// Registered under /groups, next to the group routes.
export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/:id/attendance",
    {
      onRequest: app.requireAbility("read", "Attendance"),
      schema: {
        params: groupParams,
        querystring: monthQuery,
        response: { 200: groupAttendanceResponse, ...guardedErrorResponses(400, 404) },
      },
    },
    async (request) => getGroupAttendance(app.db, request.params.id, request.query.month),
  );

  routes.post(
    "/:id/sessions/month",
    {
      onRequest: app.requireAbility("create", "Attendance"),
      schema: {
        params: groupParams,
        body: createMonthSessionsBody,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      await createMonthSessions(
        app.db,
        actorOf(request),
        request.params.id,
        request.body.month,
        isoDateIn(new Date(), config.GYM_TIME_ZONE),
      );
      return reply.status(204).send();
    },
  );

  routes.post(
    "/:id/sessions",
    {
      onRequest: app.requireAbility("create", "Attendance"),
      schema: {
        params: groupParams,
        body: createTrainingSessionBody,
        response: { 201: trainingSessionResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(
          await addTrainingSession(
            app.db,
            actorOf(request),
            request.params.id,
            request.body.date,
            isoDateIn(new Date(), config.GYM_TIME_ZONE),
          ),
        ),
  );

  routes.delete(
    "/:id/sessions/:sessionId",
    {
      onRequest: app.requireAbility("delete", "Attendance"),
      schema: {
        params: trainingSessionParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(404, 409) },
      },
    },
    async (request, reply) => {
      await deleteTrainingSession(app.db, actorOf(request), request.params.id, request.params.sessionId);
      return reply.status(204).send();
    },
  );

  routes.put(
    "/:id/sessions/:sessionId/attendance/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: attendanceParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      const { id, sessionId, memberId } = request.params;
      await markAttendance(
        app.db,
        actorOf(request),
        { groupId: id, sessionId, memberId },
        isoDateIn(new Date(), config.GYM_TIME_ZONE),
      );
      return reply.status(204).send();
    },
  );

  routes.delete(
    "/:id/sessions/:sessionId/attendance/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: attendanceParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(404) },
      },
    },
    async (request, reply) => {
      const { id, sessionId, memberId } = request.params;
      await unmarkAttendance(app.db, actorOf(request), { groupId: id, sessionId, memberId });
      return reply.status(204).send();
    },
  );

  routes.put(
    "/:id/months/:month/members/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: monthMemberParams,
        body: addMonthMemberBody,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      const { id, month, memberId } = request.params;
      await addMonthMember(
        app.db,
        actorOf(request),
        { groupId: id, month, memberId },
        { joinGroup: request.body.joinGroup, today: isoDateIn(new Date(), config.GYM_TIME_ZONE) },
      );
      return reply.status(204).send();
    },
  );

  routes.put(
    "/:id/months/:month/members/:memberId/subscription",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: monthMemberParams,
        body: setMonthSubscriptionBody,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      const { id, month, memberId } = request.params;
      await setMonthSubscription(
        app.db,
        actorOf(request),
        { groupId: id, month, memberId },
        request.body.subscriptionId,
      );
      return reply.status(204).send();
    },
  );

  routes.put(
    "/:id/months/:month/members/:memberId/paid",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: monthMemberParams,
        body: setMonthPaidBody,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      const { id, month, memberId } = request.params;
      await setMonthPaid(app.db, actorOf(request), { groupId: id, month, memberId }, request.body.paid);
      return reply.status(204).send();
    },
  );

  routes.put(
    "/:id/months/:month/members/:memberId/comment",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: monthMemberParams,
        body: setMonthCommentBody,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404) },
      },
    },
    async (request, reply) => {
      const { id, month, memberId } = request.params;
      await setMonthComment(app.db, actorOf(request), { groupId: id, month, memberId }, request.body.comment);
      return reply.status(204).send();
    },
  );

  routes.delete(
    "/:id/months/:month/members/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: monthMemberParams,
        response: { 204: z.undefined(), ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request, reply) => {
      const { id, month, memberId } = request.params;
      await removeMonthMember(app.db, actorOf(request), { groupId: id, month, memberId });
      return reply.status(204).send();
    },
  );
};
