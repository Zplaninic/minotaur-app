import {
  ADULT_AGE,
  DEFAULT_MEMBER_ROLE,
  type ImportMemberRow,
  type ImportMembersBody,
  type ImportMembersResponse,
  type ImportRowProblem,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import { subscriptionFields } from "./attendance.js";
import { recordEvent, type Actor } from "./audit.js";
import { monthOf, monthStart, toDbDate, toIsoDate } from "./dates.js";
import { ageOn } from "./members.js";

// A full import writes a few rows per member, more than the default 5 seconds allow.
const IMPORT_TIMEOUT_MS = 60_000;

type Tx = Prisma.TransactionClient;
type SubscriptionRow = { id: number; name: string; price: number; sessionsPerWeek: number };
type RowResult = ImportMembersResponse["rows"][number];

// Two members are the same person when name, surname and birthday match, ignoring case.
const personKey = (person: { name: string; surname: string; birthday: string | null }): string =>
  [person.name.toLowerCase(), person.surname.toLowerCase(), person.birthday ?? ""].join("\u0000");

const activeMemberKeys = async (tx: Tx, orgId: number, rows: readonly ImportMemberRow[]): Promise<Set<string>> => {
  const members = await tx.member.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: rows.map((row) => ({
        name: { equals: row.name, mode: "insensitive" },
        surname: { equals: row.surname, mode: "insensitive" },
        birthday: row.birthday ? toDbDate(row.birthday) : null,
      })),
    },
    select: { name: true, surname: true, birthday: true },
  });
  return new Set(
    members.map((member) => personKey({ ...member, birthday: member.birthday ? toIsoDate(member.birthday) : null })),
  );
};

// today is YYYY-MM-DD at the gym; ISO dates sort like the days they stand for.
const problemsOf = (
  row: ImportMemberRow,
  subscriptions: ReadonlyMap<string, SubscriptionRow>,
  today: string,
): ImportRowProblem[] => {
  const problems: ImportRowProblem[] = [];
  if (row.birthday !== undefined && row.birthday > today) {
    problems.push("birthdayInFuture");
  } else if (row.birthday !== undefined && row.guardianName === undefined && ageOn(row.birthday, today) < ADULT_AGE) {
    problems.push("guardianRequired");
  }
  if (row.subscription !== undefined && !subscriptions.has(row.subscription)) {
    problems.push("subscriptionNotFound");
  }
  return problems;
};

// A later row for a person already seen, in the database or the file, is a duplicate.
const checkRows = (
  rows: readonly ImportMemberRow[],
  existing: Set<string>,
  subscriptions: ReadonlyMap<string, SubscriptionRow>,
  today: string,
): RowResult[] =>
  rows.map((row) => {
    const key = personKey({ ...row, birthday: row.birthday ?? null });
    if (existing.has(key)) {
      return { status: "duplicate", problems: [] };
    }
    existing.add(key);
    const problems = problemsOf(row, subscriptions, today);
    return { status: problems.length > 0 ? "invalid" : "create", problems };
  });

// Guardians already in the org, by email; the oldest wins when several share one.
const guardiansByEmail = async (
  tx: Tx,
  orgId: number,
  rows: readonly ImportMemberRow[],
): Promise<Map<string, number>> => {
  const emails = rows.flatMap((row) => (row.guardianEmail ? [row.guardianEmail] : []));
  const guardians = await tx.guardian.findMany({
    where: { orgId, email: { in: emails } },
    select: { id: true, email: true },
    orderBy: { id: "desc" },
  });
  return new Map(guardians.flatMap((guardian) => (guardian.email ? [[guardian.email, guardian.id] as const] : [])));
};

const guardianFor = async (
  tx: Tx,
  orgId: number,
  row: ImportMemberRow,
  byEmail: Map<string, number>,
): Promise<number | undefined> => {
  if (row.guardianName === undefined) {
    return undefined;
  }
  const known = row.guardianEmail ? byEmail.get(row.guardianEmail) : undefined;
  if (known !== undefined) {
    return known;
  }
  const guardian = await tx.guardian.create({
    data: { orgId, name: row.guardianName, email: row.guardianEmail ?? null },
    select: { id: true },
  });
  if (row.guardianEmail) {
    byEmail.set(row.guardianEmail, guardian.id);
  }
  return guardian.id;
};

const createImportedMember = async (
  tx: Tx,
  actor: Actor,
  row: ImportMemberRow,
  context: { byEmail: Map<string, number>; subscriptions: ReadonlyMap<string, SubscriptionRow>; month: string },
): Promise<void> => {
  const { orgId } = actor;
  const member = await tx.member.create({
    data: {
      orgId,
      name: row.name,
      surname: row.surname,
      birthday: row.birthday ? toDbDate(row.birthday) : null,
      role: DEFAULT_MEMBER_ROLE,
    },
    select: { id: true },
  });
  const guardianId = await guardianFor(tx, orgId, row, context.byEmail);
  if (guardianId !== undefined) {
    await tx.memberGuardian.create({ data: { memberId: member.id, guardianId } });
  }
  await recordEvent(tx, actor, { action: "member_created", memberId: member.id });

  const subscription = row.subscription === undefined ? undefined : context.subscriptions.get(row.subscription);
  if (subscription) {
    // Later months carry this subscription over when the member joins their rosters.
    await tx.memberMonth.create({
      data: { memberId: member.id, month: monthStart(context.month), ...subscriptionFields(subscription) },
    });
    await recordEvent(tx, actor, {
      action: "month_subscription_set",
      memberId: member.id,
      month: context.month,
      subscriptionId: subscription.id,
      changes: { subscription: { from: null, to: subscription.id } },
    });
  }
};

// Checks every row, then creates the new members in the actor's org only when
// no row is invalid and this is not a dry run: an import is all or nothing.
export const importMembers = async (
  db: Db,
  actor: Actor,
  body: ImportMembersBody,
  today: string,
): Promise<ImportMembersResponse> => {
  const { orgId } = actor;

  return db.$transaction(
    async (tx) => {
      const names = body.rows.flatMap((row) => (row.subscription ? [row.subscription] : []));
      const subscriptionRows = await tx.subscription.findMany({
        where: { orgId, name: { in: names } },
        select: { id: true, name: true, price: true, sessionsPerWeek: true },
      });
      const subscriptions = new Map(subscriptionRows.map((subscription) => [subscription.name, subscription]));

      const rows = checkRows(body.rows, await activeMemberKeys(tx, orgId, body.rows), subscriptions, today);
      const imported = !body.dryRun && rows.every((row) => row.status !== "invalid");
      if (!imported) {
        return { imported, rows };
      }

      const context = { byEmail: await guardiansByEmail(tx, orgId, body.rows), subscriptions, month: monthOf(today) };
      for (const [index, row] of body.rows.entries()) {
        if (rows[index]?.status === "create") {
          await createImportedMember(tx, actor, row, context);
        }
      }
      return { imported, rows };
    },
    { timeout: IMPORT_TIMEOUT_MS },
  );
};
