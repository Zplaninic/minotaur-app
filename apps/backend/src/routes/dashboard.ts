import { dashboardResponse } from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { config } from "../config.js";
import { isoDateIn } from "../services/dates.js";
import { getDashboard } from "../services/dashboard.js";
import { guardedErrorResponses } from "./responses.js";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Attendance"),
      schema: {
        response: { 200: dashboardResponse, ...guardedErrorResponses() },
      },
    },
    async () => getDashboard(app.db, isoDateIn(new Date(), config.GYM_TIME_ZONE)),
  );
};
