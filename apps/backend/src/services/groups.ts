import {
  GROUP_OWNER_ROLE,
  isGroupMemberRole,
  weekday,
  type CreateGroupBody,
  type GroupResponse,
  type ListGroupMembersResponse,
  type ListGroupsResponse,
  type Weekday,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { monthOf, monthStart, monthsFrom } from "./attendance.js";
import { guardianSelect, toGuardianResponse } from "./guardians.js";
import { toApiId, toDbId } from "./ids.js";

const groupSelect = {
  id: true,
  days: true,
  from: true,
  to: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, surname: true } },
  _count: { select: { members: true } },
} satisfies Prisma.GroupSelect;

type GroupRow = Prisma.GroupGetPayload<{ select: typeof groupSelect }>;

// Postgres `time` values travel as the time on 1970-01-01 UTC in a Date.
const toDbTime = (time: string): Date => new Date(`1970-01-01T${time}:00.000Z`);
const toTimeOfDay = (date: Date): string => date.toISOString().slice(11, 16);

const inWeekOrder = (days: readonly Weekday[]): Weekday[] => weekday.options.filter((day) => days.includes(day));

const toGroupResponse = (group: GroupRow): GroupResponse => ({
  id: toApiId(group.id),
  owner: { id: toApiId(group.owner.id), name: group.owner.name, surname: group.owner.surname },
  days: inWeekOrder(group.days),
  from: toTimeOfDay(group.from),
  to: toTimeOfDay(group.to),
  memberCount: group._count.members,
  createdAt: group.createdAt.toISOString(),
  updatedAt: group.updatedAt.toISOString(),
});

export const listGroups = async (db: Db): Promise<ListGroupsResponse> => {
  const groups = await db.group.findMany({
    where: { deletedAt: null },
    select: groupSelect,
    orderBy: [{ owner: { surname: "asc" } }, { owner: { name: "asc" } }, { from: "asc" }, { id: "asc" }],
  });
  return { items: groups.map(toGroupResponse) };
};

export const createGroup = async (db: Db, body: CreateGroupBody): Promise<GroupResponse> => {
  const ownerId = toDbId(body.ownerId);
  if (ownerId === undefined) {
    throw new AppError("NOT_FOUND", 404, "Owner not found");
  }

  return db.$transaction(async (tx) => {
    const owner = await tx.member.findUnique({ where: { id: ownerId, deletedAt: null }, select: { role: true } });
    if (!owner) {
      throw new AppError("NOT_FOUND", 404, "Owner not found");
    }
    if (owner.role !== GROUP_OWNER_ROLE) {
      throw new AppError("VALIDATION_ERROR", 400, "The owner of a group must be a trainer");
    }

    const group = await tx.group.create({
      data: { ownerId, days: inWeekOrder(body.days), from: toDbTime(body.from), to: toDbTime(body.to) },
      select: groupSelect,
    });
    return toGroupResponse(group);
  });
};

const groupNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Group not found");
const memberNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Member not found");

const requireGroupId = (groupId: string): number => {
  const id = toDbId(groupId);
  if (id === undefined) {
    throw groupNotFound();
  }
  return id;
};

export const getGroup = async (db: Db, groupId: string): Promise<GroupResponse> => {
  const group = await db.group.findUnique({
    where: { id: requireGroupId(groupId), deletedAt: null },
    select: groupSelect,
  });
  if (!group) {
    throw groupNotFound();
  }
  return toGroupResponse(group);
};

const groupMemberSelect = {
  id: true,
  name: true,
  surname: true,
  birthday: true,
  email: true,
  phone: true,
  guardians: {
    select: { guardian: { select: guardianSelect } },
    orderBy: [{ guardian: { surname: "asc" } }, { guardian: { name: "asc" } }, { guardianId: "asc" }],
  },
} satisfies Prisma.MemberSelect;

export const listGroupMembers = async (db: Db, groupId: string): Promise<ListGroupMembersResponse> => {
  const group = await db.group.findUnique({
    where: { id: requireGroupId(groupId), deletedAt: null },
    select: {
      members: {
        select: { member: { select: groupMemberSelect } },
        orderBy: [{ member: { surname: "asc" } }, { member: { name: "asc" } }, { memberId: "asc" }],
      },
    },
  });
  if (!group) {
    throw groupNotFound();
  }
  return {
    items: group.members.map(({ member }) => ({
      id: toApiId(member.id),
      name: member.name,
      surname: member.surname,
      birthday: member.birthday.toISOString().slice(0, 10),
      email: member.email,
      phone: member.phone,
      guardians: member.guardians.map((link) => toGuardianResponse(link.guardian)),
    })),
  };
};

// Adding a member who is already in the group changes nothing. The member
// also joins the roster of the current month and of later months with
// sessions; past months stay as they were. today is YYYY-MM-DD at the gym.
export const addGroupMember = async (db: Db, groupId: string, memberId: string, today: string): Promise<void> => {
  const groupDbId = requireGroupId(groupId);
  const memberDbId = toDbId(memberId);
  if (memberDbId === undefined) {
    throw memberNotFound();
  }

  await db.$transaction(async (tx) => {
    if (!(await tx.group.findUnique({ where: { id: groupDbId, deletedAt: null }, select: { id: true } }))) {
      throw groupNotFound();
    }
    const member = await tx.member.findUnique({ where: { id: memberDbId, deletedAt: null }, select: { role: true } });
    if (!member) {
      throw memberNotFound();
    }
    if (!isGroupMemberRole(member.role)) {
      throw new AppError("VALIDATION_ERROR", 400, "Only children and members can be added to a group");
    }

    await tx.groupMember.upsert({
      where: { groupId_memberId: { groupId: groupDbId, memberId: memberDbId } },
      create: { groupId: groupDbId, memberId: memberDbId },
      update: {},
    });
    const months = await monthsFrom(tx, groupDbId, monthOf(today));
    await tx.groupMonthMember.createMany({
      data: months.map((month) => ({ groupId: groupDbId, month: monthStart(month), memberId: memberDbId })),
      skipDuplicates: true,
    });
  });
};

// Removing a member who is not in the group changes nothing. The member also
// leaves the rosters of months after the current one, which have no ticks
// yet; the current and past months keep them. today is YYYY-MM-DD at the gym.
export const removeGroupMember = async (db: Db, groupId: string, memberId: string, today: string): Promise<void> => {
  const groupDbId = requireGroupId(groupId);
  if (!(await db.group.findUnique({ where: { id: groupDbId, deletedAt: null }, select: { id: true } }))) {
    throw groupNotFound();
  }
  const memberDbId = toDbId(memberId);
  if (memberDbId !== undefined) {
    await db.$transaction([
      db.groupMember.deleteMany({ where: { groupId: groupDbId, memberId: memberDbId } }),
      db.groupMonthMember.deleteMany({
        where: { groupId: groupDbId, memberId: memberDbId, month: { gt: monthStart(monthOf(today)) } },
      }),
    ]);
  }
};

// Takes a member out of every group and out of the rosters after the current
// month, which have no ticks yet; the current and past months keep them.
// today is YYYY-MM-DD at the gym.
export const leaveGroups = async (db: Prisma.TransactionClient, memberId: number, today: string): Promise<void> => {
  await db.groupMember.deleteMany({ where: { memberId } });
  await db.groupMonthMember.deleteMany({ where: { memberId, month: { gt: monthStart(monthOf(today)) } } });
};

// Hides the group and keeps its members, rosters, sessions and attendance for history.
export const archiveGroup = async (db: Db, groupId: string, now: Date): Promise<void> => {
  const { count } = await db.group.updateMany({
    where: { id: requireGroupId(groupId), deletedAt: null },
    data: { deletedAt: now },
  });
  if (count === 0) {
    throw groupNotFound();
  }
};
