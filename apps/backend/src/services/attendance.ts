import {
  isGroupMemberRole,
  type GroupAttendanceResponse,
  type Month,
  type MonthMemberSubscription,
  type TrainingSessionResponse,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { recordEvent, type Actor, type StoredChanges } from "./audit.js";
import { monthOf, monthRange, monthStart, nextMonth, toDbDate, toIsoDate, trainingDates } from "./dates.js";
import { requireDbId, toApiId, toDbId } from "./ids.js";

type DbClient = Db | Prisma.TransactionClient;

// Sessions can be created only for the current or the next month at the gym.
const requireCreatableMonth = (month: Month, today: string): void => {
  const current = monthOf(today);
  if (month !== current && month !== nextMonth(current)) {
    throw new AppError("VALIDATION_ERROR", 400, "Sessions can be created only for the current or next month");
  }
};

const groupNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Group not found");
const sessionNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Session not found");
const memberNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Member not found");
const subscriptionNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Subscription not found");

// A group of another org is as unknown as one that does not exist.
const requireGroup = async (db: DbClient, orgId: number, groupId: number) => {
  const group = await db.group.findUnique({
    where: { id: groupId, orgId, deletedAt: null },
    select: { id: true, days: true },
  });
  if (!group) {
    throw groupNotFound();
  }
  return group;
};

const toSessionResponse = (session: { id: number; date: Date }): TrainingSessionResponse => ({
  id: toApiId(session.id),
  date: toIsoDate(session.date),
});

type MonthSubscriptionRow = {
  subscriptionPrice: number | null;
  subscriptionSessionsPerWeek: number | null;
  subscription: { id: number; name: string } | null;
};

const toMonthMemberSubscription = (row: MonthSubscriptionRow): MonthMemberSubscription | null =>
  row.subscription && row.subscriptionPrice !== null && row.subscriptionSessionsPerWeek !== null
    ? {
        id: toApiId(row.subscription.id),
        name: row.subscription.name,
        sessionsPerWeek: row.subscriptionSessionsPerWeek,
        price: row.subscriptionPrice,
      }
    : null;

// The subscription columns of a member's month: a subscription with its
// current price and sessions copied in, or all three cleared.
type MonthSubscriptionFields = {
  subscriptionId: number | null;
  subscriptionPrice: number | null;
  subscriptionSessionsPerWeek: number | null;
};

const noSubscription: MonthSubscriptionFields = {
  subscriptionId: null,
  subscriptionPrice: null,
  subscriptionSessionsPerWeek: null,
};

export const subscriptionFields = (subscription: {
  id: number;
  price: number;
  sessionsPerWeek: number;
}): MonthSubscriptionFields => ({
  subscriptionId: subscription.id,
  subscriptionPrice: subscription.price,
  subscriptionSessionsPerWeek: subscription.sessionsPerWeek,
});

// Call before members join a month's roster: gives each member who has no
// row for the month yet the subscription of their latest earlier month, in
// any group, at its current price and sessions. Every month starts unpaid.
export const ensureMemberMonths = async (
  db: DbClient,
  month: Month,
  memberIds: readonly number[],
): Promise<void> => {
  const existing = await db.memberMonth.findMany({
    where: { memberId: { in: [...memberIds] }, month: monthStart(month) },
    select: { memberId: true },
  });
  const have = new Set(existing.map((row) => row.memberId));
  const missing = memberIds.filter((memberId) => !have.has(memberId));
  if (missing.length === 0) {
    return;
  }

  const earlier = await db.memberMonth.findMany({
    where: { memberId: { in: missing }, month: { lt: monthStart(month) } },
    select: { memberId: true, subscription: { select: { id: true, price: true, sessionsPerWeek: true } } },
    orderBy: { month: "desc" },
  });
  const carried = new Map<number, MonthSubscriptionFields>();
  for (const row of earlier) {
    if (!carried.has(row.memberId)) {
      carried.set(row.memberId, row.subscription ? subscriptionFields(row.subscription) : noSubscription);
    }
  }
  await db.memberMonth.createMany({
    data: missing.map((memberId) => ({
      memberId,
      month: monthStart(month),
      ...(carried.get(memberId) ?? noSubscription),
    })),
    skipDuplicates: true,
  });
};

export const getGroupAttendance = async (
  db: Db,
  orgId: number,
  groupId: string,
  month: Month,
): Promise<GroupAttendanceResponse> => {
  const group = await db.group.findUnique({
    where: { id: requireDbId(groupId, "Group not found"), orgId, deletedAt: null },
    select: {
      sessions: {
        where: { date: monthRange(month) },
        select: { id: true, date: true },
        orderBy: { date: "asc" },
      },
      monthMembers: {
        where: { month: monthStart(month) },
        select: {
          member: { select: { id: true, name: true, surname: true, isNew: true } },
          memberMonth: {
            select: {
              subscriptionPrice: true,
              subscriptionSessionsPerWeek: true,
              subscription: { select: { id: true, name: true } },
              paid: true,
              comment: true,
            },
          },
        },
        orderBy: [{ member: { name: "asc" } }, { member: { surname: "asc" } }, { memberId: "asc" }],
      },
    },
  });
  if (!group) {
    throw groupNotFound();
  }

  const ticks = await db.attendance.findMany({
    where: { sessionId: { in: group.sessions.map((session) => session.id) } },
    select: { sessionId: true, memberId: true },
    orderBy: { sessionId: "asc" },
  });
  // Ticks come in session order, so each member's list keeps that order.
  const sessionIdsByMember = new Map<number, string[]>();
  for (const tick of ticks) {
    const sessionIds = sessionIdsByMember.get(tick.memberId) ?? [];
    sessionIds.push(toApiId(tick.sessionId));
    sessionIdsByMember.set(tick.memberId, sessionIds);
  }

  return {
    sessions: group.sessions.map(toSessionResponse),
    members: group.monthMembers.map((row) => ({
      id: toApiId(row.member.id),
      name: row.member.name,
      surname: row.member.surname,
      attendedSessionIds: sessionIdsByMember.get(row.member.id) ?? [],
      subscription: toMonthMemberSubscription(row.memberMonth),
      paid: row.memberMonth.paid,
      comment: row.memberMonth.comment,
      isNew: row.member.isNew,
    })),
  };
};

// Called when a month gets its first session: the group's current members
// become the month's roster. Later changes to it are made per month.
const copyGroupMembersToMonth = async (db: DbClient, groupId: number, month: Month): Promise<void> => {
  const members = await db.groupMember.findMany({ where: { groupId }, select: { memberId: true } });
  await ensureMemberMonths(
    db,
    month,
    members.map(({ memberId }) => memberId),
  );
  await db.groupMonthMember.createMany({
    data: members.map(({ memberId }) => ({ groupId, month: monthStart(month), memberId })),
    skipDuplicates: true,
  });
};

const countMonthSessions = (db: DbClient, groupId: number, month: Month): Promise<number> =>
  db.trainingSession.count({ where: { groupId, date: monthRange(month) } });

// Dates that already have a session are skipped, so calling it twice changes
// nothing. today is YYYY-MM-DD at the gym.
export const createMonthSessions = async (
  db: Db,
  actor: Actor,
  groupId: string,
  month: Month,
  today: string,
): Promise<void> => {
  const group = await requireGroup(db, actor.orgId, requireDbId(groupId, "Group not found"));
  requireCreatableMonth(month, today);
  await db.$transaction(async (tx) => {
    const before = await countMonthSessions(tx, group.id, month);
    const { count } = await tx.trainingSession.createMany({
      data: trainingDates(month, group.days).map((date) => ({ groupId: group.id, date: toDbDate(date) })),
      skipDuplicates: true,
    });
    if (before === 0) {
      await copyGroupMembersToMonth(tx, group.id, month);
    }
    if (count > 0) {
      await recordEvent(tx, actor, {
        action: "month_sessions_created",
        groupId: group.id,
        month,
        changes: { sessions: { from: before, to: before + count } },
      });
    }
  });
};

// A date that already has a session is a unique constraint error, answered as
// CONFLICT. today is YYYY-MM-DD at the gym.
export const addTrainingSession = async (
  db: Db,
  actor: Actor,
  groupId: string,
  date: string,
  today: string,
): Promise<TrainingSessionResponse> => {
  const group = await requireGroup(db, actor.orgId, requireDbId(groupId, "Group not found"));
  requireCreatableMonth(monthOf(date), today);
  return db.$transaction(async (tx) => {
    const before = await countMonthSessions(tx, group.id, monthOf(date));
    const session = await tx.trainingSession.create({
      data: { groupId: group.id, date: toDbDate(date) },
      select: { id: true, date: true },
    });
    if (before === 0) {
      await copyGroupMembersToMonth(tx, group.id, monthOf(date));
    }
    await recordEvent(tx, actor, { action: "training_session_added", groupId: group.id, month: monthOf(date), date });
    return toSessionResponse(session);
  });
};

// Only a session nobody attended can go, so no attendance is ever lost.
export const deleteTrainingSession = async (
  db: Db,
  actor: Actor,
  groupId: string,
  sessionId: string,
): Promise<void> => {
  const groupDbId = requireDbId(groupId, "Group not found");
  const sessionDbId = requireDbId(sessionId, "Session not found");

  await db.$transaction(async (tx) => {
    const session = await requireSession(tx, actor.orgId, groupDbId, sessionDbId);
    // The attendance check is in the delete itself, so a tick that arrives
    // meanwhile cannot be deleted with it.
    const { count } = await tx.trainingSession.deleteMany({ where: { id: sessionDbId, attendance: { none: {} } } });
    if (count === 0) {
      throw new AppError("CONFLICT", 409, "The session has attendance");
    }
    const date = toIsoDate(session.date);
    await recordEvent(tx, actor, {
      action: "training_session_deleted",
      groupId: groupDbId,
      month: monthOf(date),
      date,
    });
  });
};

type AttendanceTarget = { groupId: string; sessionId: string; memberId: string };

// A session of an archived group is as gone as the group.
const requireSession = async (db: DbClient, orgId: number, groupId: number, sessionId: number) => {
  const session = await db.trainingSession.findFirst({
    where: { id: sessionId, groupId, group: { orgId, deletedAt: null } },
    select: { id: true, date: true },
  });
  if (!session) {
    await requireGroup(db, orgId, groupId);
    throw sessionNotFound();
  }
  return session;
};

// A member who is not where the request needs them: NOT_FOUND when the member
// does not exist in the org at all, otherwise a validation error with the reason.
const refuseMember = async (db: DbClient, orgId: number, memberId: number, reason: string): Promise<never> => {
  if (!(await db.member.findUnique({ where: { id: memberId, orgId, deletedAt: null }, select: { id: true } }))) {
    throw memberNotFound();
  }
  throw new AppError("VALIDATION_ERROR", 400, reason);
};

const requireOnRoster = async (
  db: DbClient,
  orgId: number,
  groupId: number,
  month: Month,
  memberId: number,
): Promise<void> => {
  const onRoster = await db.groupMonthMember.findUnique({
    where: { groupId_month_memberId: { groupId, month: monthStart(month), memberId } },
    select: { memberId: true },
  });
  if (!onRoster) {
    await refuseMember(db, orgId, memberId, "The member is not on this month's roster");
  }
};

// Ticking a member who is already ticked changes nothing.
export const markAttendance = async (db: Db, actor: Actor, target: AttendanceTarget, today: string): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, "Group not found");
  const sessionDbId = requireDbId(target.sessionId, "Session not found");
  const memberDbId = requireDbId(target.memberId, "Member not found");

  await db.$transaction(async (tx) => {
    const session = await requireSession(tx, actor.orgId, groupDbId, sessionDbId);
    if (toIsoDate(session.date) > today) {
      throw new AppError("VALIDATION_ERROR", 400, "Attendance cannot be taken for a future session");
    }

    const date = toIsoDate(session.date);
    await requireOnRoster(tx, actor.orgId, groupDbId, monthOf(date), memberDbId);
    const { count } = await tx.attendance.createMany({
      data: [{ sessionId: sessionDbId, memberId: memberDbId }],
      skipDuplicates: true,
    });
    if (count > 0) {
      await recordEvent(tx, actor, {
        action: "attendance_marked",
        groupId: groupDbId,
        memberId: memberDbId,
        month: monthOf(date),
        date,
      });
    }
  });
};

// Unticking a member who is not ticked changes nothing.
export const unmarkAttendance = async (db: Db, actor: Actor, target: AttendanceTarget): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, "Group not found");
  const sessionDbId = requireDbId(target.sessionId, "Session not found");
  const memberDbId = toDbId(target.memberId);

  await db.$transaction(async (tx) => {
    const session = await requireSession(tx, actor.orgId, groupDbId, sessionDbId);
    if (memberDbId === undefined) {
      return;
    }
    const { count } = await tx.attendance.deleteMany({ where: { sessionId: sessionDbId, memberId: memberDbId } });
    if (count > 0) {
      const date = toIsoDate(session.date);
      await recordEvent(tx, actor, {
        action: "attendance_unmarked",
        groupId: groupDbId,
        memberId: memberDbId,
        month: monthOf(date),
        date,
      });
    }
  });
};

type MonthMemberTarget = { groupId: string; month: Month; memberId: string };

// Adding a member who is already on the roster changes nothing. Any child or
// member can be added, and only to a month that has sessions. With joinGroup
// they also join the group, as joinGroup below describes. today is YYYY-MM-DD
// at the gym.
export const addMonthMember = async (
  db: Db,
  actor: Actor,
  target: MonthMemberTarget,
  options: { joinGroup: boolean; today: string },
): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, "Group not found");
  const memberDbId = requireDbId(target.memberId, "Member not found");

  await db.$transaction(async (tx) => {
    await requireGroup(tx, actor.orgId, groupDbId);
    const member = await tx.member.findUnique({
      where: { id: memberDbId, orgId: actor.orgId, deletedAt: null },
      select: { role: true },
    });
    if (!member) {
      throw memberNotFound();
    }
    if (!isGroupMemberRole(member.role)) {
      throw new AppError("VALIDATION_ERROR", 400, "Only children and members can be added to a month");
    }
    if ((await countMonthSessions(tx, groupDbId, target.month)) === 0) {
      throw new AppError("VALIDATION_ERROR", 400, "The month has no sessions");
    }
    if (options.joinGroup && (await joinGroup(tx, groupDbId, memberDbId, options.today))) {
      await recordEvent(tx, actor, { action: "group_member_added", groupId: groupDbId, memberId: memberDbId });
    }
    await ensureMemberMonths(tx, target.month, [memberDbId]);
    const { count } = await tx.groupMonthMember.createMany({
      data: [{ groupId: groupDbId, month: monthStart(target.month), memberId: memberDbId }],
      skipDuplicates: true,
    });
    if (count > 0) {
      await recordEvent(tx, actor, {
        action: "month_member_added",
        groupId: groupDbId,
        memberId: memberDbId,
        month: target.month,
      });
    }
  });
};

// Refused while the member has ticks in the month, so no attendance is lost.
// Removing a member who is not on the roster changes nothing.
export const removeMonthMember = async (db: Db, actor: Actor, target: MonthMemberTarget): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, "Group not found");
  const memberDbId = toDbId(target.memberId);

  await db.$transaction(async (tx) => {
    await requireGroup(tx, actor.orgId, groupDbId);
    if (memberDbId === undefined) {
      return;
    }
    const ticks = await tx.attendance.count({
      where: { memberId: memberDbId, session: { groupId: groupDbId, date: monthRange(target.month) } },
    });
    if (ticks > 0) {
      throw new AppError("CONFLICT", 409, "The member has attendance this month");
    }
    const { count } = await tx.groupMonthMember.deleteMany({
      where: { groupId: groupDbId, month: monthStart(target.month), memberId: memberDbId },
    });
    if (count > 0) {
      await recordEvent(tx, actor, {
        action: "month_member_removed",
        groupId: groupDbId,
        memberId: memberDbId,
        month: target.month,
      });
    }
  });
};

// The subscription and payment are the member's for the whole month, but
// they are changed from a group's sheet, so the member must be on its roster.
const requireGroupRoster = async (
  db: DbClient,
  orgId: number,
  groupId: number,
  month: Month,
  memberId: number,
): Promise<void> => {
  await requireGroup(db, orgId, groupId);
  await requireOnRoster(db, orgId, groupId, month, memberId);
};

// Sets a member's subscription for one month, in all their groups, copying
// its current price and sessions. null clears it, which a paid month refuses.
// The month's row of a member on the group's roster, as it is before a change.
const requireMemberMonth = async (db: DbClient, orgId: number, groupId: number, month: Month, memberId: number) => {
  await requireGroupRoster(db, orgId, groupId, month, memberId);
  return db.memberMonth.findUniqueOrThrow({
    where: { memberId_month: { memberId, month: monthStart(month) } },
    select: { subscriptionId: true, paid: true, comment: true },
  });
};

const recordMonthEvent = (
  db: DbClient,
  actor: Actor,
  action: "month_subscription_set" | "month_paid_set" | "month_comment_set",
  target: { groupId: number; memberId: number; month: Month },
  subscriptionId: number | null,
  changes: StoredChanges,
): Promise<void> => recordEvent(db, actor, { action, ...target, subscriptionId, changes });

export const setMonthSubscription = async (
  db: Db,
  actor: Actor,
  target: MonthMemberTarget,
  subscriptionId: string | null,
): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, "Group not found");
  const memberDbId = requireDbId(target.memberId, "Member not found");
  const subscriptionDbId = subscriptionId === null ? null : requireDbId(subscriptionId, "Subscription not found");
  const eventTarget = { groupId: groupDbId, memberId: memberDbId, month: target.month };

  await db.$transaction(async (tx) => {
    const before = await requireMemberMonth(tx, actor.orgId, groupDbId, target.month, memberDbId);
    const key = { memberId: memberDbId, month: monthStart(target.month) };

    if (subscriptionDbId === null) {
      // One statement, so a month marked paid meanwhile is not cleared.
      const { count } = await tx.memberMonth.updateMany({ where: { ...key, paid: false }, data: noSubscription });
      if (count === 0) {
        throw new AppError("CONFLICT", 409, "A paid month keeps its subscription");
      }
    } else {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionDbId, orgId: actor.orgId },
        select: { id: true, price: true, sessionsPerWeek: true },
      });
      if (!subscription) {
        throw subscriptionNotFound();
      }
      await tx.memberMonth.update({ where: { memberId_month: key }, data: subscriptionFields(subscription) });
    }

    if (before.subscriptionId !== subscriptionDbId) {
      await recordMonthEvent(tx, actor, "month_subscription_set", eventTarget, subscriptionDbId, {
        subscription: { from: before.subscriptionId, to: subscriptionDbId },
      });
    }
  });
};

// Marks whether a member paid for the month, in all their groups. Only a
// month with a subscription can be paid.
export const setMonthPaid = async (db: Db, actor: Actor, target: MonthMemberTarget, paid: boolean): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, "Group not found");
  const memberDbId = requireDbId(target.memberId, "Member not found");
  await db.$transaction(async (tx) => {
    const before = await requireMemberMonth(tx, actor.orgId, groupDbId, target.month, memberDbId);
    const key = { memberId: memberDbId, month: monthStart(target.month) };
    // One statement, so a subscription cleared meanwhile is not paid.
    const { count } = await tx.memberMonth.updateMany({
      where: paid ? { ...key, subscriptionId: { not: null } } : key,
      data: { paid },
    });
    if (count === 0) {
      throw new AppError("VALIDATION_ERROR", 400, "Only a month with a subscription can be paid");
    }
    if (before.paid !== paid) {
      const eventTarget = { groupId: groupDbId, memberId: memberDbId, month: target.month };
      await recordMonthEvent(tx, actor, "month_paid_set", eventTarget, before.subscriptionId, {
        paid: { from: before.paid, to: paid },
      });
    }
  });
};

// Sets or clears (null) the member's comment for the month, in all their groups.
// The comment is free text about a member, so the log only marks that it changed.
export const setMonthComment = async (
  db: Db,
  actor: Actor,
  target: MonthMemberTarget,
  comment: string | null,
): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, "Group not found");
  const memberDbId = requireDbId(target.memberId, "Member not found");
  await db.$transaction(async (tx) => {
    const before = await requireMemberMonth(tx, actor.orgId, groupDbId, target.month, memberDbId);
    await tx.memberMonth.update({
      where: { memberId_month: { memberId: memberDbId, month: monthStart(target.month) } },
      data: { comment },
    });
    if (before.comment !== comment) {
      const eventTarget = { groupId: groupDbId, memberId: memberDbId, month: target.month };
      await recordMonthEvent(tx, actor, "month_comment_set", eventTarget, null, { comment: { changed: true } });
    }
  });
};

// For the group's member changes: the current month and every later month
// that already has sessions.
export const monthsFrom = async (db: DbClient, groupId: number, fromMonth: Month): Promise<Month[]> => {
  const sessions = await db.trainingSession.findMany({
    where: { groupId, date: { gte: monthStart(fromMonth) } },
    select: { date: true },
  });
  return [...new Set(sessions.map((session) => monthOf(toIsoDate(session.date))))].toSorted();
};

// Makes the member a member of the group and puts them on the roster of the
// current month and of later months with sessions; past months stay as they
// were. Joining twice changes nothing. Returns whether the member was new to
// the group. today is YYYY-MM-DD at the gym.
export const joinGroup = async (db: DbClient, groupId: number, memberId: number, today: string): Promise<boolean> => {
  const { count } = await db.groupMember.createMany({ data: [{ groupId, memberId }], skipDuplicates: true });
  const months = await monthsFrom(db, groupId, monthOf(today));
  for (const month of months) {
    await ensureMemberMonths(db, month, [memberId]);
  }
  await db.groupMonthMember.createMany({
    data: months.map((month) => ({ groupId, month: monthStart(month), memberId })),
    skipDuplicates: true,
  });
  return count > 0;
};
