import { z } from "zod";
import { month } from "./attendance.js";
import { id } from "./common.js";
import { priceCents } from "./subscription.js";

// A sum of prices in euro cents. Unlike a single price it has no upper limit.
const totalCents = z.number().int().min(0);
const count = z.number().int().min(0);

export const subscriptionSummaryQuery = z.object({ month });
export type SubscriptionSummaryQuery = z.infer<typeof subscriptionSummaryQuery>;

// One month's money, over the members who have a subscription that month.
// expected sums the copied prices, collected only the paid ones.
export const subscriptionSummaryResponse = z.object({
  month,
  members: count,
  paid: count,
  unpaid: count,
  expected: totalCents,
  collected: totalCents,
  open: totalCents,
  bySubscription: z.array(
    z.object({
      id,
      name: z.string(),
      members: count,
      paid: count,
      expected: totalCents,
      collected: totalCents,
    }),
  ),
});
export type SubscriptionSummaryResponse = z.infer<typeof subscriptionSummaryResponse>;

// A past month a member had a subscription for and did not pay.
export const overdueMonth = z.object({
  month,
  subscription: z.object({ id, name: z.string() }),
  price: priceCents,
});
export type OverdueMonth = z.infer<typeof overdueMonth>;

// Members by surname, each with their unpaid months, oldest first.
export const overduePaymentsResponse = z.object({
  items: z.array(
    z.object({
      id,
      name: z.string(),
      surname: z.string(),
      months: z.array(overdueMonth),
      total: totalCents,
    }),
  ),
  total: totalCents,
});
export type OverduePaymentsResponse = z.infer<typeof overduePaymentsResponse>;
