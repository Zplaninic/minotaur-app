import { z } from "zod";
import { id } from "./common.js";

export const MAX_SUBSCRIPTION_NAME_LENGTH = 100;
export const MIN_SESSIONS_PER_WEEK = 1;
export const MAX_SESSIONS_PER_WEEK = 7;
// 999 999,99 €: six digits of euros, which the form input also allows.
export const MAX_PRICE_CENTS = 99_999_999;

// Euro cents, so prices are whole numbers and never lose a cent to rounding.
export const priceCents = z.number().int().min(0).max(MAX_PRICE_CENTS);

export const sessionsPerWeek = z.number().int().min(MIN_SESSIONS_PER_WEEK).max(MAX_SESSIONS_PER_WEEK);

// Used for both create and update: an edit replaces every field.
export const subscriptionBody = z.object({
  name: z.string().trim().min(1).max(MAX_SUBSCRIPTION_NAME_LENGTH),
  sessionsPerWeek,
  price: priceCents,
});
export type SubscriptionBody = z.infer<typeof subscriptionBody>;

export const subscriptionParams = z.object({ id });
export type SubscriptionParams = z.infer<typeof subscriptionParams>;

export const subscriptionResponse = z.object({
  id,
  name: z.string(),
  sessionsPerWeek,
  price: priceCents,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type SubscriptionResponse = z.infer<typeof subscriptionResponse>;

export const listSubscriptionsResponse = z.object({
  items: z.array(subscriptionResponse),
});
export type ListSubscriptionsResponse = z.infer<typeof listSubscriptionsResponse>;
