import type {
  ListSubscriptionsResponse,
  Month,
  OverduePaymentsResponse,
  SubscriptionBody,
  SubscriptionResponse,
  SubscriptionSummaryResponse,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { diff, hasChanges, initial, recordEvent, type Actor } from "./audit.js";
import { monthOf, monthStart, toIsoDate } from "./dates.js";
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

const auditFieldsOf = (subscription: SubscriptionBody) => ({
  name: subscription.name,
  sessionsPerWeek: subscription.sessionsPerWeek,
  price: subscription.price,
});

// A name that is already taken fails with a unique constraint error, which
// the error handler answers with CONFLICT.
export const createSubscription = async (
  db: Db,
  actor: Actor,
  body: SubscriptionBody,
): Promise<SubscriptionResponse> =>
  db.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({ data: body, select: subscriptionSelect });
    await recordEvent(tx, actor, {
      action: "subscription_created",
      subscriptionId: subscription.id,
      changes: initial(auditFieldsOf(body)),
    });
    return toSubscriptionResponse(subscription);
  });

// Replaces every field. A taken name fails with CONFLICT.
export const updateSubscription = async (
  db: Db,
  actor: Actor,
  subscriptionId: string,
  body: SubscriptionBody,
): Promise<SubscriptionResponse> => {
  const id = toDbId(subscriptionId);
  if (id === undefined) {
    throw subscriptionNotFound();
  }
  return db.$transaction(async (tx) => {
    const before = await tx.subscription.findUnique({ where: { id }, select: subscriptionSelect });
    if (!before) {
      throw subscriptionNotFound();
    }
    const subscription = await tx.subscription.update({ where: { id }, data: body, select: subscriptionSelect });
    const changes = diff(auditFieldsOf(before), auditFieldsOf(body));
    if (hasChanges(changes)) {
      await recordEvent(tx, actor, { action: "subscription_updated", subscriptionId: id, changes });
    }
    return toSubscriptionResponse(subscription);
  });
};

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

type SummaryRow = { subscriptionId: number; name: string; price: number; paid: boolean };

const totals = (rows: readonly SummaryRow[]) => {
  const paid = rows.filter((row) => row.paid);
  return {
    members: rows.length,
    paid: paid.length,
    expected: sum(rows.map((row) => row.price)),
    collected: sum(paid.map((row) => row.price)),
  };
};

// One month's money over the members who have a subscription that month,
// at the prices copied when it was set.
export const getSubscriptionSummary = async (db: Db, month: Month): Promise<SubscriptionSummaryResponse> => {
  const memberMonths = await db.memberMonth.findMany({
    where: { month: monthStart(month), subscriptionId: { not: null } },
    select: { subscriptionPrice: true, paid: true, subscription: { select: { id: true, name: true } } },
  });
  const rows = memberMonths.flatMap((row): SummaryRow[] =>
    row.subscription && row.subscriptionPrice !== null
      ? [{ subscriptionId: row.subscription.id, name: row.subscription.name, price: row.subscriptionPrice, paid: row.paid }]
      : [],
  );

  const all = totals(rows);
  const groups = new Map<number, { name: string; rows: SummaryRow[] }>();
  for (const row of rows) {
    const group = groups.get(row.subscriptionId) ?? { name: row.name, rows: [] };
    group.rows.push(row);
    groups.set(row.subscriptionId, group);
  }
  const bySubscription = [...groups]
    .map(([subscriptionId, group]) => ({ id: toApiId(subscriptionId), name: group.name, ...totals(group.rows) }))
    .toSorted((a, b) => a.name.localeCompare(b.name));

  return {
    month,
    ...all,
    unpaid: all.members - all.paid,
    open: all.expected - all.collected,
    bySubscription,
  };
};

// Past months, before the current one at the gym, that a member had a
// subscription for and did not pay. Archived members are left out.
// today is YYYY-MM-DD at the gym.
export const listOverduePayments = async (db: Db, today: string): Promise<OverduePaymentsResponse> => {
  const unpaid = await db.memberMonth.findMany({
    where: {
      month: { lt: monthStart(monthOf(today)) },
      subscriptionId: { not: null },
      paid: false,
      member: { deletedAt: null },
    },
    select: {
      month: true,
      subscriptionPrice: true,
      subscription: { select: { id: true, name: true } },
      member: { select: { id: true, name: true, surname: true } },
    },
    orderBy: [{ member: { name: "asc" } }, { member: { surname: "asc" } }, { memberId: "asc" }, { month: "asc" }],
  });

  const items: OverduePaymentsResponse["items"] = [];
  for (const row of unpaid) {
    if (!row.subscription || row.subscriptionPrice === null) {
      continue;
    }
    const memberId = toApiId(row.member.id);
    let item = items.at(-1);
    if (item?.id !== memberId) {
      item = { id: memberId, name: row.member.name, surname: row.member.surname, months: [], total: 0 };
      items.push(item);
    }
    item.months.push({
      month: monthOf(toIsoDate(row.month)),
      subscription: { id: toApiId(row.subscription.id), name: row.subscription.name },
      price: row.subscriptionPrice,
    });
    item.total += row.subscriptionPrice;
  }
  return { items, total: sum(items.map((item) => item.total)) };
};
