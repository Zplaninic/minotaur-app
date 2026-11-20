import {
  ADULT_AGE,
  DEFAULT_MEMBER_ROLE,
  type CreateGuardianBody,
  type CreateMemberBody,
  type ListMembersQuery,
  type ListMembersResponse,
  type MemberGuardianInput,
  type MemberResponse,
  type UpdateMemberBody,
} from "@repo/shared";
import { isLoginRole } from "@repo/shared/auth";
import type { Db } from "../db/client.js";
import { deleteMemberSessions } from "../auth/sessions.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { diff, hasChanges, recordEvent, type Actor } from "./audit.js";
import { monthOf, monthStart, toDbDate, toIsoDate } from "./dates.js";
import { leaveGroups } from "./groups.js";
import { guardianSelect, toGuardianResponse } from "./guardians.js";
import { requireDbId, toApiId } from "./ids.js";

const memberSelect = {
  id: true,
  orgId: true,
  name: true,
  surname: true,
  birthday: true,
  role: true,
  taxNumber: true,
  email: true,
  phone: true,
  createdAt: true,
  guardians: {
    select: { guardian: { select: guardianSelect } },
    orderBy: [{ guardian: { name: "asc" } }, { guardian: { surname: "asc" } }, { guardianId: "asc" }],
  },
} satisfies Prisma.MemberSelect;

type MemberRow = Prisma.MemberGetPayload<{ select: typeof memberSelect }>;

type ResolvedGuardian = { kind: "existing"; id: number } | ({ kind: "new" } & CreateGuardianBody);

// Age in whole years. Both dates are YYYY-MM-DD; today is the day at the gym.
// The MM-DD parts sort like the days of the year they stand for.
export const ageOn = (birthday: string, today: string): number => {
  const age = Number(today.slice(0, 4)) - Number(birthday.slice(0, 4));
  return today.slice(5) < birthday.slice(5) ? age - 1 : age;
};

const toMemberResponse = (member: MemberRow): MemberResponse => ({
  id: toApiId(member.id),
  orgId: toApiId(member.orgId),
  name: member.name,
  surname: member.surname,
  birthday: member.birthday ? toIsoDate(member.birthday) : null,
  role: member.role,
  taxNumber: member.taxNumber,
  email: member.email,
  phone: member.phone,
  guardians: member.guardians.map((link) => toGuardianResponse(link.guardian)),
  createdAt: member.createdAt.toISOString(),
});

// Every word of the search must match the name, surname or email.
const searchWhere = (search: string | undefined): Prisma.MemberWhereInput[] =>
  (search ?? "")
    .split(/\s+/)
    .filter((word) => word !== "")
    .map((word) => {
      const filter = { contains: word, mode: "insensitive" } as const;
      return { OR: [{ name: filter }, { surname: filter }, { email: filter }] };
    });

// With unpaid, only members who had a subscription in a month before the
// current one and did not pay for it. today is YYYY-MM-DD at the gym.

export const listMembers = async (
  db: Db,
  orgId: number,
  query: ListMembersQuery,
  today: string,
): Promise<ListMembersResponse> => {
  const where: Prisma.MemberWhereInput = {
    orgId,
    deletedAt: null,
    AND: searchWhere(query.search),
    ...(query.role ? { role: query.role } : {}),
    ...(query.unpaid
      ? {
          months: {
            some: { month: { lt: monthStart(monthOf(today)) }, subscriptionId: { not: null }, paid: false },
          },
        }
      : {}),
  };
  const [total, members] = await db.$transaction([
    db.member.count({ where }),
    db.member.findMany({
      where,
      select: memberSelect,
      orderBy: [{ name: "asc" }, { surname: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { items: members.map(toMemberResponse), page: query.page, pageSize: query.pageSize, total };
};

type DbClient = Db | Prisma.TransactionClient;

// A birthday cannot be in the future, and a minor needs a guardian. Without a
// birthday the age is unknown, so no guardian is required. today is
// YYYY-MM-DD at the gym; ISO dates sort like the days they stand for.
const requireValidBirthday = (
  body: { birthday?: string | undefined; guardians: readonly unknown[] },
  today: string,
): void => {
  if (body.birthday === undefined) {
    return;
  }
  if (body.birthday > today) {
    throw new AppError("VALIDATION_ERROR", 400, "The birthday cannot be in the future");
  }
  if (body.guardians.length === 0 && ageOn(body.birthday, today) < ADULT_AGE) {
    throw new AppError("VALIDATION_ERROR", 400, `A member younger than ${ADULT_AGE} needs at least one guardian`);
  }
};

const resolveGuardians = (guardians: readonly MemberGuardianInput[]): ResolvedGuardian[] =>
  guardians.map((guardian) =>
    guardian.kind === "existing"
      ? { kind: "existing", id: requireDbId(guardian.guardianId, "Guardian not found") }
      : guardian,
  );

const requireExistingGuardians = async (
  db: DbClient,
  orgId: number,
  guardians: readonly ResolvedGuardian[],
): Promise<void> => {
  const existingIds = guardians.flatMap((guardian) => (guardian.kind === "existing" ? [guardian.id] : []));
  if ((await db.guardian.count({ where: { orgId, id: { in: existingIds } } })) !== existingIds.length) {
    throw new AppError("NOT_FOUND", 404, "Guardian not found");
  }
};

// Creates the new guardians and links every guardian to the member.
const linkGuardians = async (
  db: DbClient,
  orgId: number,
  memberId: number,
  guardians: readonly ResolvedGuardian[],
): Promise<void> => {
  for (const guardian of guardians) {
    const guardianId =
      guardian.kind === "existing"
        ? guardian.id
        : (
            await db.guardian.create({
              data: {
                orgId,
                name: guardian.name,
                surname: guardian.surname ?? null,
                email: guardian.email ?? null,
                phone: guardian.phone ?? null,
              },
              select: { id: true },
            })
          ).id;
    await db.memberGuardian.create({ data: { memberId, guardianId } });
  }
};

export const createMember = async (
  db: Db,
  actor: Actor,
  body: CreateMemberBody,
  today: string,
): Promise<MemberResponse> => {
  requireValidBirthday(body, today);
  const { orgId } = actor;
  const guardians = resolveGuardians(body.guardians);

  return db.$transaction(async (tx) => {
    await requireExistingGuardians(tx, orgId, guardians);

    const member = await tx.member.create({
      data: {
        orgId,
        name: body.name,
        surname: body.surname,
        birthday: body.birthday ? toDbDate(body.birthday) : null,
        role: DEFAULT_MEMBER_ROLE,
        taxNumber: body.taxNumber ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
      },
      select: { id: true },
    });
    await linkGuardians(tx, orgId, member.id, guardians);
    await recordEvent(tx, actor, { action: "member_created", memberId: member.id });

    return toMemberResponse(await tx.member.findUniqueOrThrow({ where: { id: member.id }, select: memberSelect }));
  });
};

export const getMember = async (db: Db, orgId: number, memberId: string): Promise<MemberResponse> => {
  const member = await db.member.findUnique({
    where: { id: requireDbId(memberId, "Member not found"), orgId, deletedAt: null },
    select: memberSelect,
  });
  if (!member) {
    throw new AppError("NOT_FOUND", 404, "Member not found");
  }
  return toMemberResponse(member);
};

// Replaces the editable fields. A taken OIB or login email is a unique
// constraint error, answered as CONFLICT. Unlinked guardians are kept. A
// member who logs in keeps an email: it is their login name.
const editableSelect = {
  name: true,
  surname: true,
  birthday: true,
  taxNumber: true,
  email: true,
  phone: true,
  guardians: { select: { guardianId: true } },
} satisfies Prisma.MemberSelect;

// Every editable field is personal, so the log only marks which ones changed.
const EDITABLE_FIELDS = ["name", "surname", "birthday", "taxNumber", "email", "phone", "guardians"] as const;

const editableFieldsOf = (member: Prisma.MemberGetPayload<{ select: typeof editableSelect }>) => ({
  name: member.name,
  surname: member.surname,
  birthday: member.birthday ? toIsoDate(member.birthday) : null,
  taxNumber: member.taxNumber,
  email: member.email,
  phone: member.phone,
  guardians: member.guardians.map((link) => String(link.guardianId)).toSorted(),
});

export const updateMember = async (
  db: Db,
  actor: Actor,
  memberId: string,
  body: UpdateMemberBody,
  today: string,
): Promise<MemberResponse> => {
  requireValidBirthday(body, today);
  const memberDbId = requireDbId(memberId, "Member not found");
  const guardians = resolveGuardians(body.guardians);

  return db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: memberDbId, orgId: actor.orgId, deletedAt: null },
      select: { role: true, ...editableSelect },
    });
    if (!member) {
      throw new AppError("NOT_FOUND", 404, "Member not found");
    }
    if (isLoginRole(member.role) && !body.email) {
      throw new AppError("VALIDATION_ERROR", 400, "A member who logs in needs an email");
    }
    await requireExistingGuardians(tx, actor.orgId, guardians);

    await tx.member.update({
      where: { id: memberDbId },
      data: {
        name: body.name,
        surname: body.surname,
        birthday: body.birthday ? toDbDate(body.birthday) : null,
        taxNumber: body.taxNumber ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
      },
    });
    await tx.memberGuardian.deleteMany({ where: { memberId: memberDbId } });
    await linkGuardians(tx, actor.orgId, memberDbId, guardians);

    const after = await tx.member.findUniqueOrThrow({ where: { id: memberDbId }, select: editableSelect });
    const changes = diff(editableFieldsOf(member), editableFieldsOf(after), EDITABLE_FIELDS);
    if (hasChanges(changes)) {
      await recordEvent(tx, actor, { action: "member_updated", memberId: memberDbId, changes });
    }

    return toMemberResponse(await tx.member.findUniqueOrThrow({ where: { id: memberDbId }, select: memberSelect }));
  });
};

// Sets or removes the "New" badge. Setting it to what it already is changes nothing.
export const setMemberNew = async (db: Db, actor: Actor, memberId: string, isNew: boolean): Promise<void> => {
  const id = requireDbId(memberId, "Member not found");
  await db.$transaction(async (tx) => {
    const before = await tx.member.findUnique({
      where: { id, orgId: actor.orgId, deletedAt: null },
      select: { isNew: true },
    });
    if (!before) {
      throw new AppError("NOT_FOUND", 404, "Member not found");
    }
    if (before.isNew === isNew) {
      return;
    }
    await tx.member.update({ where: { id }, data: { isNew } });
    await recordEvent(tx, actor, {
      action: "member_new_set",
      memberId: id,
      changes: { isNew: { from: before.isNew, to: isNew } },
    });
  });
};

// Hides the member and keeps their past rosters and attendance for history.
// They leave their groups and the rosters after the current month, the same
// as being removed from a group, and lose their login. A group's owner must
// be active, so an owner of active groups cannot be archived. Nobody archives
// themselves, so the last admin cannot lock everyone out. today is YYYY-MM-DD
// at the gym.
export const archiveMember = async (
  db: Db,
  actor: Actor,
  memberId: string,
  now: Date,
  today: string,
): Promise<void> => {
  const memberDbId = requireDbId(memberId, "Member not found");
  if (memberDbId === actor.memberId) {
    throw new AppError("FORBIDDEN", 403, "You cannot delete yourself");
  }

  await db.$transaction(async (tx) => {
    const { count } = await tx.member.updateMany({
      where: { id: memberDbId, orgId: actor.orgId, deletedAt: null },
      data: { deletedAt: now },
    });
    if (count === 0) {
      throw new AppError("NOT_FOUND", 404, "Member not found");
    }
    if ((await tx.group.count({ where: { ownerId: memberDbId, deletedAt: null } })) > 0) {
      throw new AppError("CONFLICT", 409, "The member owns groups; give them to another trainer first");
    }
    await leaveGroups(tx, memberDbId, today);
    await tx.login.deleteMany({ where: { memberId: memberDbId } });
    await deleteMemberSessions(tx, memberDbId);
    await recordEvent(tx, actor, { action: "member_archived", memberId: memberDbId });
  });
};
