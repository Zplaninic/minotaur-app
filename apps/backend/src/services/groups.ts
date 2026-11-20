import {
  GROUP_OWNER_ROLE,
  isGroupMemberRole,
  weekday,
  type CreateGroupBody,
  type GroupResponse,
  type ListGroupMembersResponse,
  type ListGroupsResponse,
  type UpdateGroupBody,
  type Weekday,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { joinGroup } from "./attendance.js";
import { diff, initial, hasChanges, recordEvent, type Actor } from "./audit.js";
import { monthOf, monthStart, toIsoDate, toTimeOfDay } from "./dates.js";
import { guardianSelect, toGuardianResponse } from "./guardians.js";
import { toApiId, toDbId } from "./ids.js";

const groupSelect = {
  id: true,
  days: true,
  from: true,
  to: true,
  ageFrom: true,
  ageTo: true,
  maxMembers: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, surname: true } },
  _count: { select: { members: true } },
} satisfies Prisma.GroupSelect;

type GroupRow = Prisma.GroupGetPayload<{ select: typeof groupSelect }>;

// Postgres `time` values travel as the time on 1970-01-01 UTC in a Date.
const toDbTime = (time: string): Date => new Date(`1970-01-01T${time}:00.000Z`);

const inWeekOrder = (days: readonly Weekday[]): Weekday[] => weekday.options.filter((day) => days.includes(day));

const toGroupResponse = (group: GroupRow): GroupResponse => ({
  id: toApiId(group.id),
  owner: { id: toApiId(group.owner.id), name: group.owner.name, surname: group.owner.surname },
  days: inWeekOrder(group.days),
  from: toTimeOfDay(group.from),
  to: toTimeOfDay(group.to),
  ageFrom: group.ageFrom,
  ageTo: group.ageTo,
  maxMembers: group.maxMembers,
  memberCount: group._count.members,
  createdAt: group.createdAt.toISOString(),
  updatedAt: group.updatedAt.toISOString(),
});

export const listGroups = async (db: Db, orgId: number): Promise<ListGroupsResponse> => {
  const groups = await db.group.findMany({
    where: { orgId, deletedAt: null },
    select: groupSelect,
    orderBy: [{ owner: { name: "asc" } }, { owner: { surname: "asc" } }, { from: "asc" }, { id: "asc" }],
  });
  return { items: groups.map(toGroupResponse) };
};

const ownerNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Owner not found");

// Returns the owner's database id once they are known to be a trainer of the org.
const requireTrainer = async (tx: Prisma.TransactionClient, orgId: number, ownerId: string): Promise<number> => {
  const id = toDbId(ownerId);
  if (id === undefined) {
    throw ownerNotFound();
  }
  const owner = await tx.member.findUnique({ where: { id, orgId, deletedAt: null }, select: { role: true } });
  if (!owner) {
    throw ownerNotFound();
  }
  if (owner.role !== GROUP_OWNER_ROLE) {
    throw new AppError("VALIDATION_ERROR", 400, "The owner of a group must be a trainer");
  }
  return id;
};

const toGroupData = (body: CreateGroupBody, ownerId: number) => ({
  ownerId,
  days: inWeekOrder(body.days),
  from: toDbTime(body.from),
  to: toDbTime(body.to),
  ageFrom: body.ageFrom,
  ageTo: body.ageTo,
  maxMembers: body.maxMembers,
});

// What the log keeps of a group. The owner is a member id, resolved to a name when read.
const auditFieldsOf = (group: {
  ownerId: number;
  days: Weekday[];
  from: Date;
  to: Date;
  ageFrom: number | null;
  ageTo: number | null;
  maxMembers: number | null;
}) => ({
  owner: group.ownerId,
  days: inWeekOrder(group.days),
  from: toTimeOfDay(group.from),
  to: toTimeOfDay(group.to),
  ageFrom: group.ageFrom,
  ageTo: group.ageTo,
  maxMembers: group.maxMembers,
});

const auditSelect = {
  ownerId: true,
  days: true,
  from: true,
  to: true,
  ageFrom: true,
  ageTo: true,
  maxMembers: true,
} satisfies Prisma.GroupSelect;

export const createGroup = async (db: Db, actor: Actor, body: CreateGroupBody): Promise<GroupResponse> =>
  db.$transaction(async (tx) => {
    const ownerId = await requireTrainer(tx, actor.orgId, body.ownerId);
    const data = toGroupData(body, ownerId);
    const group = await tx.group.create({ data: { ...data, orgId: actor.orgId }, select: groupSelect });
    await recordEvent(tx, actor, { action: "group_created", groupId: group.id, changes: initial(auditFieldsOf(data)) });
    return toGroupResponse(group);
  });

const groupNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Group not found");
const memberNotFound = (): AppError => new AppError("NOT_FOUND", 404, "Member not found");

const requireGroupId = (groupId: string): number => {
  const id = toDbId(groupId);
  if (id === undefined) {
    throw groupNotFound();
  }
  return id;
};

export const getGroup = async (db: Db, orgId: number, groupId: string): Promise<GroupResponse> => {
  const group = await db.group.findUnique({
    where: { id: requireGroupId(groupId), orgId, deletedAt: null },
    select: groupSelect,
  });
  if (!group) {
    throw groupNotFound();
  }
  return toGroupResponse(group);
};

// Replaces the whole group. Sessions already recorded stay as they are, even
// on days the group no longer trains.
export const updateGroup = async (
  db: Db,
  actor: Actor,
  groupId: string,
  body: UpdateGroupBody,
): Promise<GroupResponse> => {
  const id = requireGroupId(groupId);
  return db.$transaction(async (tx) => {
    const before = await tx.group.findUnique({ where: { id, orgId: actor.orgId, deletedAt: null }, select: auditSelect });
    if (!before) {
      throw groupNotFound();
    }
    const ownerId = await requireTrainer(tx, actor.orgId, body.ownerId);
    const data = toGroupData(body, ownerId);
    const group = await tx.group.update({ where: { id }, data, select: groupSelect });
    const changes = diff(auditFieldsOf(before), auditFieldsOf(data));
    if (hasChanges(changes)) {
      await recordEvent(tx, actor, { action: "group_updated", groupId: id, changes });
    }
    return toGroupResponse(group);
  });
};

const groupMemberSelect = {
  id: true,
  name: true,
  surname: true,
  birthday: true,
  email: true,
  phone: true,
  isNew: true,
  guardians: {
    select: { guardian: { select: guardianSelect } },
    orderBy: [{ guardian: { name: "asc" } }, { guardian: { surname: "asc" } }, { guardianId: "asc" }],
  },
} satisfies Prisma.MemberSelect;

export const listGroupMembers = async (db: Db, orgId: number, groupId: string): Promise<ListGroupMembersResponse> => {
  const group = await db.group.findUnique({
    where: { id: requireGroupId(groupId), orgId, deletedAt: null },
    select: {
      members: {
        select: { member: { select: groupMemberSelect } },
        orderBy: [{ member: { name: "asc" } }, { member: { surname: "asc" } }, { memberId: "asc" }],
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
      birthday: member.birthday ? toIsoDate(member.birthday) : null,
      email: member.email,
      phone: member.phone,
      guardians: member.guardians.map((link) => toGuardianResponse(link.guardian)),
      isNew: member.isNew,
    })),
  };
};

// Adding a member who is already in the group changes nothing. See joinGroup
// for the month rosters. today is YYYY-MM-DD at the gym.
export const addGroupMember = async (
  db: Db,
  actor: Actor,
  groupId: string,
  memberId: string,
  today: string,
): Promise<void> => {
  const groupDbId = requireGroupId(groupId);
  const memberDbId = toDbId(memberId);
  if (memberDbId === undefined) {
    throw memberNotFound();
  }

  await db.$transaction(async (tx) => {
    const { orgId } = actor;
    if (!(await tx.group.findUnique({ where: { id: groupDbId, orgId, deletedAt: null }, select: { id: true } }))) {
      throw groupNotFound();
    }
    const member = await tx.member.findUnique({
      where: { id: memberDbId, orgId, deletedAt: null },
      select: { role: true },
    });
    if (!member) {
      throw memberNotFound();
    }
    if (!isGroupMemberRole(member.role)) {
      throw new AppError("VALIDATION_ERROR", 400, "Only children and members can be added to a group");
    }

    if (await joinGroup(tx, groupDbId, memberDbId, today)) {
      await recordEvent(tx, actor, { action: "group_member_added", groupId: groupDbId, memberId: memberDbId });
    }
  });
};

// Removing a member who is not in the group changes nothing. The member also
// leaves the rosters of months after the current one, which have no ticks
// yet; the current and past months keep them. today is YYYY-MM-DD at the gym.
export const removeGroupMember = async (
  db: Db,
  actor: Actor,
  groupId: string,
  memberId: string,
  today: string,
): Promise<void> => {
  const groupDbId = requireGroupId(groupId);
  const inOrg = { id: groupDbId, orgId: actor.orgId, deletedAt: null };
  if (!(await db.group.findUnique({ where: inOrg, select: { id: true } }))) {
    throw groupNotFound();
  }
  const memberDbId = toDbId(memberId);
  if (memberDbId === undefined) {
    return;
  }
  await db.$transaction(async (tx) => {
    const { count } = await tx.groupMember.deleteMany({ where: { groupId: groupDbId, memberId: memberDbId } });
    await tx.groupMonthMember.deleteMany({
      where: { groupId: groupDbId, memberId: memberDbId, month: { gt: monthStart(monthOf(today)) } },
    });
    if (count > 0) {
      await recordEvent(tx, actor, { action: "group_member_removed", groupId: groupDbId, memberId: memberDbId });
    }
  });
};

// Takes a member out of every group and out of the rosters after the current
// month, which have no ticks yet; the current and past months keep them.
// today is YYYY-MM-DD at the gym.
export const leaveGroups = async (db: Prisma.TransactionClient, memberId: number, today: string): Promise<void> => {
  await db.groupMember.deleteMany({ where: { memberId } });
  await db.groupMonthMember.deleteMany({ where: { memberId, month: { gt: monthStart(monthOf(today)) } } });
};

// Hides the group and keeps its members, rosters, sessions and attendance for history.
export const archiveGroup = async (db: Db, actor: Actor, groupId: string, now: Date): Promise<void> => {
  const id = requireGroupId(groupId);
  await db.$transaction(async (tx) => {
    const { count } = await tx.group.updateMany({
      where: { id, orgId: actor.orgId, deletedAt: null },
      data: { deletedAt: now },
    });
    if (count === 0) {
      throw groupNotFound();
    }
    await recordEvent(tx, actor, { action: "group_archived", groupId: id });
  });
};
