import {
  errorResponse,
  listSubscriptionsResponse,
  subscriptionBody,
  subscriptionParams,
  subscriptionResponse,
} from "@repo/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createSubscription, listSubscriptions, updateSubscription } from "../services/subscriptions.js";

export const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    "/",
    {
      onRequest: app.requireAbility("read", "Subscription"),
      schema: {
        response: { 200: listSubscriptionsResponse, 401: errorResponse, 403: errorResponse, 500: errorResponse },
      },
    },
    async () => listSubscriptions(app.db),
  );

  routes.post(
    "/",
    {
      onRequest: app.requireAbility("create", "Subscription"),
      schema: {
        body: subscriptionBody,
        response: {
          201: subscriptionResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
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
        response: {
          200: subscriptionResponse,
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request) => updateSubscription(app.db, request.params.id, request.body),
  );
};
