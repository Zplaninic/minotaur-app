import {
  weekday,
  type GroupAttendanceResponse,
  type Month,
  type TrainingSessionResponse,
  type Weekday,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { toApiId, toDbId } from "./ids.js";

type DbClient = Db | Prisma.TransactionClient;

// Postgres `date` values travel as midnight UTC in a Date.
const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

// The calendar day in a time zone, as YYYY-MM-DD.
export const isoDateIn = (now: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now)
    .reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
  return `${parts["year"]}-${parts["month"]}-${parts["day"]}`;
};

// The month of a YYYY-MM-DD date.
export const monthOf = (isoDate: string): Month => isoDate.slice(0, 7);

const nextMonth = (month: Month): Month => {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  return monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
};

// Sessions can be created only for the current or the next month at the gym.
const requireCreatableMonth = (month: Month, today: string): void => {
  const current = monthOf(today);
  if (month !== current && month !== nextMonth(current)) {
    throw new AppError("VALIDATION_ERROR", 400, "Sessions can be created only for the current or next month");
  }
};

// A month as stored in group_month_member: its first day.
export const monthStart = (month: Month): Date => toDbDate(`${month}-01`);

const monthRange = (month: Month): { gte: Date; lt: Date } => {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(year, monthNumber - 1, 1)), lt: new Date(Date.UTC(year, monthNumber, 1)) };
};

// weekday lists Monday first; getUTCDay counts from Sunday.
const weekdayOf = (date: Date): Weekday | undefined => weekday.options[(date.getUTCDay() + 6) % 7];

// Every date of the month that falls on one of the days, as YYYY-MM-DD.
export const trainingDates = (month: Month, days: readonly Weekday[]): string[] => {
  const { gte, lt } = monthRange(month);
  const dates: string[] = [];
  for (const date = new Date(gte); date < lt; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = weekdayOf(date);
    if (day && days.includes(day)) {
      dates.push(toIsoDate(date));
    }
  }
  return dates;
};

const groupNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Group not found");
const sessionNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Session not found");
const memberNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Member not found");

const requireDbId = (value: string, notFound: () => AppError): number => {
  const id = toDbId(value);
  if (id === undefined) {
    throw notFound();
  }
  return id;
};

const requireGroup = async (db: DbClient, groupId: number) => {
  const group = await db.group.findUnique({ where: { id: groupId, deletedAt: null }, select: { id: true, days: true } });
  if (!group) {
    throw groupNotFound();
  }
  return group;
};

const toSessionResponse = (session: { id: number; date: Date }): TrainingSessionResponse => ({
  id: toApiId(session.id),
  date: toIsoDate(session.date),
});

export const getGroupAttendance = async (db: Db, groupId: string, month: Month): Promise<GroupAttendanceResponse> => {
  const group = await db.group.findUnique({
    where: { id: requireDbId(groupId, groupNotFound), deletedAt: null },
    select: {
      sessions: {
        where: { date: monthRange(month) },
        select: { id: true, date: true },
        orderBy: { date: "asc" },
      },
      monthMembers: {
        where: { month: monthStart(month) },
        select: { member: { select: { id: true, name: true, surname: true } } },
        orderBy: [{ member: { surname: "asc" } }, { member: { name: "asc" } }, { memberId: "asc" }],
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

  return {
    sessions: group.sessions.map(toSessionResponse),
    members: group.monthMembers.map(({ member }) => ({
      id: toApiId(member.id),
      name: member.name,
      surname: member.surname,
      attendedSessionIds: ticks.filter((tick) => tick.memberId === member.id).map((tick) => toApiId(tick.sessionId)),
    })),
  };
};

// Called when a month gets its first session: the group's current members
// become the month's roster. Later changes to it are made per month.
const copyGroupMembersToMonth = async (db: DbClient, groupId: number, month: Month): Promise<void> => {
  const members = await db.groupMember.findMany({ where: { groupId }, select: { memberId: true } });
  await db.groupMonthMember.createMany({
    data: members.map(({ memberId }) => ({ groupId, month: monthStart(month), memberId })),
    skipDuplicates: true,
  });
};

const countMonthSessions = (db: DbClient, groupId: number, month: Month): Promise<number> =>
  db.trainingSession.count({ where: { groupId, date: monthRange(month) } });

// Dates that already have a session are skipped, so calling it twice changes
// nothing. today is YYYY-MM-DD at the gym.
export const createMonthSessions = async (db: Db, groupId: string, month: Month, today: string): Promise<void> => {
  const group = await requireGroup(db, requireDbId(groupId, groupNotFound));
  requireCreatableMonth(month, today);
  await db.$transaction(async (tx) => {
    const before = await countMonthSessions(tx, group.id, month);
    await tx.trainingSession.createMany({
      data: trainingDates(month, group.days).map((date) => ({ groupId: group.id, date: toDbDate(date) })),
      skipDuplicates: true,
    });
    if (before === 0) {
      await copyGroupMembersToMonth(tx, group.id, month);
    }
  });
};

// A date that already has a session is a unique constraint error, answered as
// CONFLICT. today is YYYY-MM-DD at the gym.
export const addTrainingSession = async (
  db: Db,
  groupId: string,
  date: string,
  today: string,
): Promise<TrainingSessionResponse> => {
  const group = await requireGroup(db, requireDbId(groupId, groupNotFound));
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
    return toSessionResponse(session);
  });
};

// Only a session nobody attended can go, so no attendance is ever lost.
export const deleteTrainingSession = async (db: Db, groupId: string, sessionId: string): Promise<void> => {
  const groupDbId = requireDbId(groupId, groupNotFound);
  const sessionDbId = requireDbId(sessionId, sessionNotFound);

  // One statement, so a tick that arrives meanwhile cannot be deleted with it.
  const { count } = await db.trainingSession.deleteMany({
    where: { id: sessionDbId, groupId: groupDbId, group: { deletedAt: null }, attendance: { none: {} } },
  });
  if (count > 0) {
    return;
  }

  await requireGroup(db, groupDbId);
  if (await db.trainingSession.findFirst({ where: { id: sessionDbId, groupId: groupDbId }, select: { id: true } })) {
    throw new AppError("CONFLICT", 409, "The session has attendance");
  }
  throw sessionNotFound();
};

type AttendanceTarget = { groupId: string; sessionId: string; memberId: string };

const requireSession = async (db: DbClient, groupId: number, sessionId: number) => {
  const session = await db.trainingSession.findFirst({
    where: { id: sessionId, groupId },
    select: { id: true, date: true },
  });
  if (!session) {
    await requireGroup(db, groupId);
    throw sessionNotFound();
  }
  return session;
};

// Ticking a member who is already ticked changes nothing.
export const markAttendance = async (db: Db, target: AttendanceTarget, today: string): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, groupNotFound);
  const sessionDbId = requireDbId(target.sessionId, sessionNotFound);
  const memberDbId = requireDbId(target.memberId, memberNotFound);

  await db.$transaction(async (tx) => {
    const session = await requireSession(tx, groupDbId, sessionDbId);
    if (toIsoDate(session.date) > today) {
      throw new AppError("VALIDATION_ERROR", 400, "Attendance cannot be taken for a future session");
    }

    const onRoster = await tx.groupMonthMember.findUnique({
      where: {
        groupId_month_memberId: {
          groupId: groupDbId,
          month: monthStart(monthOf(toIsoDate(session.date))),
          memberId: memberDbId,
        },
      },
      select: { memberId: true },
    });
    if (!onRoster) {
      if (!(await tx.member.findUnique({ where: { id: memberDbId, deletedAt: null }, select: { id: true } }))) {
        throw memberNotFound();
      }
      throw new AppError("VALIDATION_ERROR", 400, "The member is not on this month's roster");
    }

    await tx.attendance.upsert({
      where: { sessionId_memberId: { sessionId: sessionDbId, memberId: memberDbId } },
      create: { sessionId: sessionDbId, memberId: memberDbId },
      update: {},
    });
  });
};

// Unticking a member who is not ticked changes nothing.
export const unmarkAttendance = async (db: Db, target: AttendanceTarget): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, groupNotFound);
  const sessionDbId = requireDbId(target.sessionId, sessionNotFound);
  await requireSession(db, groupDbId, sessionDbId);

  const memberDbId = toDbId(target.memberId);
  if (memberDbId !== undefined) {
    await db.attendance.deleteMany({ where: { sessionId: sessionDbId, memberId: memberDbId } });
  }
};

type MonthMemberTarget = { groupId: string; month: Month; memberId: string };

// Adding a member who is already on the roster changes nothing. Only the
// group's members can be added.
export const addMonthMember = async (db: Db, target: MonthMemberTarget): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, groupNotFound);
  const memberDbId = requireDbId(target.memberId, memberNotFound);

  await db.$transaction(async (tx) => {
    await requireGroup(tx, groupDbId);
    const inGroup = await tx.groupMember.findUnique({
      where: { groupId_memberId: { groupId: groupDbId, memberId: memberDbId } },
      select: { memberId: true },
    });
    if (!inGroup) {
      if (!(await tx.member.findUnique({ where: { id: memberDbId, deletedAt: null }, select: { id: true } }))) {
        throw memberNotFound();
      }
      throw new AppError("VALIDATION_ERROR", 400, "The member is not in the group");
    }
    await tx.groupMonthMember.upsert({
      where: {
        groupId_month_memberId: { groupId: groupDbId, month: monthStart(target.month), memberId: memberDbId },
      },
      create: { groupId: groupDbId, month: monthStart(target.month), memberId: memberDbId },
      update: {},
    });
  });
};

// Refused while the member has ticks in the month, so no attendance is lost.
// Removing a member who is not on the roster changes nothing.
export const removeMonthMember = async (db: Db, target: MonthMemberTarget): Promise<void> => {
  const groupDbId = requireDbId(target.groupId, groupNotFound);
  const memberDbId = toDbId(target.memberId);

  await db.$transaction(async (tx) => {
    await requireGroup(tx, groupDbId);
    if (memberDbId === undefined) {
      return;
    }
    const ticks = await tx.attendance.count({
      where: { memberId: memberDbId, session: { groupId: groupDbId, date: monthRange(target.month) } },
    });
    if (ticks > 0) {
      throw new AppError("CONFLICT", 409, "The member has attendance this month");
    }
    await tx.groupMonthMember.deleteMany({
      where: { groupId: groupDbId, month: monthStart(target.month), memberId: memberDbId },
    });
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
