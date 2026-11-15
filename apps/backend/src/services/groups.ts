import {
  GROUP_OWNER_ROLE,
  weekday,
  type CreateGroupBody,
  type GroupResponse,
  type ListGroupsResponse,
  type Weekday,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { toApiId, toDbId } from "./ids.js";

const groupSelect = {
  id: true,
  days: true,
  from: true,
  to: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, surname: true } },
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
  createdAt: group.createdAt.toISOString(),
  updatedAt: group.updatedAt.toISOString(),
});

export const listGroups = async (db: Db): Promise<ListGroupsResponse> => {
  const groups = await db.group.findMany({
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
    const owner = await tx.member.findUnique({ where: { id: ownerId }, select: { role: true } });
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
