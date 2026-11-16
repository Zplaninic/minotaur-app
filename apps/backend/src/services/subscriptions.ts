import type { ListSubscriptionsResponse, SubscriptionBody, SubscriptionResponse } from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { toApiId, toDbId } from "./ids.js";

const subscriptionSelect = {
  id: true,
  name: true,
  sessionsPerWeek: true,
  price: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SubscriptionSelect;

type SubscriptionRow = Prisma.SubscriptionGetPayload<{ select: typeof subscriptionSelect }>;

const toSubscriptionResponse = (subscription: SubscriptionRow): SubscriptionResponse => ({
  id: toApiId(subscription.id),
  name: subscription.name,
  sessionsPerWeek: subscription.sessionsPerWeek,
  price: subscription.price,
  createdAt: subscription.createdAt.toISOString(),
  updatedAt: subscription.updatedAt.toISOString(),
});

const subscriptionNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Subscription not found");

export const listSubscriptions = async (db: Db): Promise<ListSubscriptionsResponse> => {
  const subscriptions = await db.subscription.findMany({
    select: subscriptionSelect,
    orderBy: [{ sessionsPerWeek: "asc" }, { name: "asc" }, { id: "asc" }],
  });
  return { items: subscriptions.map(toSubscriptionResponse) };
};

// A name that is already taken fails with a unique constraint error, which
// the error handler answers with CONFLICT.
export const createSubscription = async (db: Db, body: SubscriptionBody): Promise<SubscriptionResponse> =>
  toSubscriptionResponse(await db.subscription.create({ data: body, select: subscriptionSelect }));

// Replaces every field. An unknown id fails with record not found (NOT_FOUND),
// a taken name with CONFLICT.
export const updateSubscription = async (
  db: Db,
  subscriptionId: string,
  body: SubscriptionBody,
): Promise<SubscriptionResponse> => {
  const id = toDbId(subscriptionId);
  if (id === undefined) {
    throw subscriptionNotFound();
  }
  return toSubscriptionResponse(await db.subscription.update({ where: { id }, data: body, select: subscriptionSelect }));
};
