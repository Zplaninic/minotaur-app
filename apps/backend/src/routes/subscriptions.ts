import {
  listSubscriptionsResponse,
  overduePaymentsResponse,
  subscriptionBody,
  subscriptionParams,
  subscriptionResponse,
  subscriptionSummaryQuery,
  subscriptionSummaryResponse,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { config } from "../config.js";
import { isoDateIn } from "../services/dates.js";
import {
  createSubscription,
  getSubscriptionSummary,
  listOverduePayments,
  listSubscriptions,
  updateSubscription,
} from "../services/subscriptions.js";
import { guardedErrorResponses } from "./responses.js";

export const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Subscription"),
      schema: {
        response: { 200: listSubscriptionsResponse, ...guardedErrorResponses() },
      },
    },
    async () => listSubscriptions(app.db),
  );

  routes.get(
    "/summary",
    {
      onRequest: app.requireAbility("read", "Subscription"),
      schema: {
        querystring: subscriptionSummaryQuery,
        response: { 200: subscriptionSummaryResponse, ...guardedErrorResponses(400) },
      },
    },
    async (request) => getSubscriptionSummary(app.db, request.query.month),
  );

  routes.get(
    "/overdue",
    {
      onRequest: app.requireAbility("read", "Subscription"),
      schema: {
        response: { 200: overduePaymentsResponse, ...guardedErrorResponses() },
      },
    },
    async () => listOverduePayments(app.db, isoDateIn(new Date(), config.GYM_TIME_ZONE)),
  );

  routes.post(
    "/",
    {
      onRequest: app.requireAbility("create", "Subscription"),
      schema: {
        body: subscriptionBody,
        response: { 201: subscriptionResponse, ...guardedErrorResponses(400, 409) },
      },
    },
    async (request, reply) => reply.status(201).send(await createSubscription(app.db, request.body)),
  );

  routes.put(
    "/:id",
    {
      onRequest: app.requireAbility("update", "Subscription"),
      schema: {
        params: subscriptionParams,
        body: subscriptionBody,
        response: { 200: subscriptionResponse, ...guardedErrorResponses(400, 404, 409) },
      },
    },
    async (request) => updateSubscription(app.db, request.params.id, request.body),
  );
};
