import {
  attendanceParams,
  createMonthSessionsBody,
  createTrainingSessionBody,
  errorResponse,
  groupAttendanceResponse,
  groupParams,
  monthMemberParams,
  monthQuery,
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
  isoDateIn,
  markAttendance,
  removeMonthMember,
  unmarkAttendance,
} from "../services/attendance.js";

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
        response: {
          200: groupAttendanceResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
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
      await createMonthSessions(
        app.db,
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
        response: {
          201: trainingSessionResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(
          await addTrainingSession(
            app.db,
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
        response: {
          204: z.undefined(),
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      await deleteTrainingSession(app.db, request.params.id, request.params.sessionId);
      return reply.status(204).send();
    },
  );

  routes.put(
    "/:id/sessions/:sessionId/attendance/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: attendanceParams,
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
      const { id, sessionId, memberId } = request.params;
      await markAttendance(app.db, { groupId: id, sessionId, memberId }, isoDateIn(new Date(), config.GYM_TIME_ZONE));
      return reply.status(204).send();
    },
  );

  routes.delete(
    "/:id/sessions/:sessionId/attendance/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: attendanceParams,
        response: { 204: z.undefined(), 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse },
      },
    },
    async (request, reply) => {
      const { id, sessionId, memberId } = request.params;
      await unmarkAttendance(app.db, { groupId: id, sessionId, memberId });
      return reply.status(204).send();
    },
  );

  routes.put(
    "/:id/months/:month/members/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: monthMemberParams,
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
      const { id, month, memberId } = request.params;
      await addMonthMember(app.db, { groupId: id, month, memberId });
      return reply.status(204).send();
    },
  );

  routes.delete(
    "/:id/months/:month/members/:memberId",
    {
      onRequest: app.requireAbility("update", "Attendance"),
      schema: {
        params: monthMemberParams,
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
      const { id, month, memberId } = request.params;
      await removeMonthMember(app.db, { groupId: id, month, memberId });
      return reply.status(204).send();
    },
  );
};
