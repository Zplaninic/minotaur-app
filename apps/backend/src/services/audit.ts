import {
  type AuditAction,
  type AuditChange,
  type AuditEventResponse,
  type AuditPerson,
  type AuditRef,
  type AuditValue,
  type ListAuditEventsQuery,
  type ListAuditEventsResponse,
  type Month,
} from "@repo/shared";
import { z } from "zod";
import type { Db } from "../db/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import { monthOf, monthStart, toDbDate, toIsoDate, toTimeOfDay } from "./dates.js";
import { toApiId, toDbId } from "./ids.js";

// Who makes a change: a logged-in member, or the system (backend commands).
export type Actor = { memberId: number } | null;
export const SYSTEM_ACTOR: Actor = null;

// A value as stored in the log. References to other records (owner,
// subscription) are stored as their database ids.
export type StoredValue = string | number | boolean | null | string[];
export type StoredChange = { from: StoredValue; to: StoredValue } | { changed: true };
export type StoredChanges = Record<string, StoredChange>;

export type AuditEventInput = {
  action: AuditAction;
  memberId?: number;
  groupId?: number;
  subscriptionId?: number | null;
  month?: Month;
  // YYYY-MM-DD
  date?: string;
  changes?: StoredChanges;
};

type DbClient = Db | Prisma.TransactionClient;

// Call inside the transaction that makes the change, so both are kept or neither.
export const recordEvent = async (db: DbClient, actor: Actor, event: AuditEventInput): Promise<void> => {
  await db.auditEvent.create({
    data: {
      action: event.action,
      actorId: actor?.memberId ?? null,
      memberId: event.memberId ?? null,
      groupId: event.groupId ?? null,
      subscriptionId: event.subscriptionId ?? null,
      month: event.month ? monthStart(event.month) : null,
      date: event.date ? toDbDate(event.date) : null,
      ...(event.changes && Object.keys(event.changes).length > 0 ? { changes: event.changes } : {}),
    },
  });
};

const sameValue = (a: StoredValue, b: StoredValue): boolean => JSON.stringify(a) === JSON.stringify(b);

// The fields that differ between before and after. Personal fields are only
// marked as changed, so their values never reach the log.
export const diff = <Fields extends Record<string, StoredValue>>(
  before: Fields,
  after: Fields,
  personal: readonly (keyof Fields & string)[] = [],
): StoredChanges => {
  const changes: StoredChanges = {};
  for (const field of Object.keys(after)) {
    const from = before[field] ?? null;
    const to = after[field] ?? null;
    if (!sameValue(from, to)) {
      changes[field] = personal.includes(field) ? { changed: true } : { from, to };
    }
  }
  return changes;
};

// The starting values of a new record, as changes from nothing.
export const initial = (fields: Record<string, StoredValue>): StoredChanges =>
  diff(Object.fromEntries(Object.keys(fields).map((field) => [field, null])), fields);

export const hasChanges = (changes: StoredChanges): boolean => Object.keys(changes).length > 0;

const storedValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]);
const storedChanges = z.record(
  z.string(),
  z.union([z.object({ from: storedValue, to: storedValue }), z.object({ changed: z.literal(true) })]),
);

// Changed fields that hold the id of another record, and what kind it is.
const REF_FIELDS: Record<string, AuditRef["kind"]> = { owner: "member", subscription: "subscription" };

const personSelect = { id: true, name: true, surname: true } as const;

const eventSelect = {
  id: true,
  action: true,
  createdAt: true,
  month: true,
  date: true,
  changes: true,
  actor: { select: personSelect },
  member: { select: personSelect },
  group: { select: { id: true, days: true, from: true, to: true, owner: { select: personSelect } } },
  subscription: { select: { id: true, name: true } },
} satisfies Prisma.AuditEventSelect;

type EventRow = Prisma.AuditEventGetPayload<{ select: typeof eventSelect }>;

const toPerson = (person: { id: number; name: string; surname: string }): AuditPerson => ({
  id: toApiId(person.id),
  name: person.name,
  surname: person.surname,
});

const parseChanges = (changes: Prisma.JsonValue): StoredChanges => storedChanges.catch({}).parse(changes ?? {});

// Reference ids in the changes, looked up once for the whole page.
const loadRefs = async (db: Db, changes: readonly StoredChanges[]) => {
  const ids = { member: new Set<number>(), subscription: new Set<number>() };
  for (const fields of changes) {
    for (const [field, change] of Object.entries(fields)) {
      const kind = REF_FIELDS[field];
      if (kind && "from" in change) {
        for (const value of [change.from, change.to]) {
          if (typeof value === "number") {
            ids[kind].add(value);
          }
        }
      }
    }
  }
  const [members, subscriptions] = await Promise.all([
    db.member.findMany({ where: { id: { in: [...ids.member] } }, select: personSelect }),
    db.subscription.findMany({ where: { id: { in: [...ids.subscription] } }, select: { id: true, name: true } }),
  ]);
  return {
    member: new Map(members.map((member): [number, AuditRef] => [member.id, { kind: "member", ...toPerson(member) }])),
    subscription: new Map(
      subscriptions.map((subscription): [number, AuditRef] => [
        subscription.id,
        { kind: "subscription", id: toApiId(subscription.id), name: subscription.name },
      ]),
    ),
  };
};

type Refs = Awaited<ReturnType<typeof loadRefs>>;

const resolveValue = (refs: Refs, field: string, value: StoredValue): AuditValue => {
  const kind = REF_FIELDS[field];
  return kind && typeof value === "number" ? (refs[kind].get(value) ?? null) : value;
};

const resolveChanges = (refs: Refs, changes: StoredChanges): Record<string, AuditChange> =>
  Object.fromEntries(
    Object.entries(changes).map(([field, change]): [string, AuditChange] => [
      field,
      "from" in change
        ? { from: resolveValue(refs, field, change.from), to: resolveValue(refs, field, change.to) }
        : change,
    ]),
  );

const toEventResponse = (refs: Refs, row: EventRow, changes: StoredChanges): AuditEventResponse => ({
  id: toApiId(row.id),
  action: row.action,
  createdAt: row.createdAt.toISOString(),
  actor: row.actor ? toPerson(row.actor) : null,
  member: row.member ? toPerson(row.member) : null,
  group: row.group
    ? {
        id: toApiId(row.group.id),
        owner: toPerson(row.group.owner),
        days: row.group.days,
        from: toTimeOfDay(row.group.from),
        to: toTimeOfDay(row.group.to),
      }
    : null,
  subscription: row.subscription ? { id: toApiId(row.subscription.id), name: row.subscription.name } : null,
  month: row.month ? monthOf(toIsoDate(row.month)) : null,
  date: row.date ? toIsoDate(row.date) : null,
  changes: resolveChanges(refs, changes),
});

const ID_FILTERS = ["before", "actorId", "memberId", "groupId"] as const;
type IdFilter = (typeof ID_FILTERS)[number];

// Newest first, one page at a time. An id filter that cannot exist matches nothing.
export const listAuditEvents = async (db: Db, query: ListAuditEventsQuery): Promise<ListAuditEventsResponse> => {
  const ids: Partial<Record<IdFilter, number>> = {};
  for (const name of ID_FILTERS) {
    const value = query[name];
    if (value !== undefined) {
      const dbId = toDbId(value);
      if (dbId === undefined) {
        return { items: [], nextCursor: null };
      }
      ids[name] = dbId;
    }
  }

  const rows = await db.auditEvent.findMany({
    where: {
      ...(ids.before !== undefined ? { id: { lt: ids.before } } : {}),
      ...(ids.actorId !== undefined ? { actorId: ids.actorId } : {}),
      ...(ids.memberId !== undefined ? { memberId: ids.memberId } : {}),
      ...(ids.groupId !== undefined ? { groupId: ids.groupId } : {}),
      ...(query.action ? { action: query.action } : {}),
      createdAt: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lt: new Date(query.to) } : {}),
      },
    },
    select: eventSelect,
    orderBy: { id: "desc" },
    // One more than the page, to know whether another page follows.
    take: query.limit + 1,
  });

  const page = rows.slice(0, query.limit);
  const changes = page.map((row) => parseChanges(row.changes));
  const refs = await loadRefs(db, changes);
  return {
    items: page.map((row, index) => toEventResponse(refs, row, changes[index] ?? {})),
    nextCursor: rows.length > query.limit ? toApiId(page.at(-1)?.id ?? 0) : null,
  };
};
