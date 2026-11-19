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
import { monthOf, monthStart, toDbDate, toIsoDate } from "./dates.js";
import { leaveGroups } from "./groups.js";
import { guardianSelect, toGuardianResponse } from "./guardians.js";
import { requireDbId, toApiId, toDbId } from "./ids.js";

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
    orderBy: [{ guardian: { surname: "asc" } }, { guardian: { name: "asc" } }, { guardianId: "asc" }],
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
  birthday: toIsoDate(member.birthday),
  role: member.role,
  taxNumber: member.taxNumber,
  email: member.email,
  phone: member.phone,
  guardians: member.guardians.map((link) => toGuardianResponse(link.guardian)),
  createdAt: member.createdAt.toISOString(),
});

// With unpaid, only members who had a subscription in a month before the
// current one and did not pay for it. today is YYYY-MM-DD at the gym.
export const listMembers = async (db: Db, query: ListMembersQuery, today: string): Promise<ListMembersResponse> => {
  const where: Prisma.MemberWhereInput = {
    deletedAt: null,
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
      orderBy: [{ surname: "asc" }, { name: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { items: members.map(toMemberResponse), page: query.page, pageSize: query.pageSize, total };
};

type DbClient = Db | Prisma.TransactionClient;

// A birthday cannot be in the future, and a minor needs a guardian. today is
// YYYY-MM-DD at the gym; ISO dates sort like the days they stand for.
const requireValidBirthday = (body: { birthday: string; guardians: readonly unknown[] }, today: string): void => {
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

const requireExistingGuardians = async (db: DbClient, guardians: readonly ResolvedGuardian[]): Promise<void> => {
  const existingIds = guardians.flatMap((guardian) => (guardian.kind === "existing" ? [guardian.id] : []));
  if ((await db.guardian.count({ where: { id: { in: existingIds } } })) !== existingIds.length) {
    throw new AppError("NOT_FOUND", 404, "Guardian not found");
  }
};

// Creates the new guardians and links every guardian to the member.
const linkGuardians = async (db: DbClient, memberId: number, guardians: readonly ResolvedGuardian[]): Promise<void> => {
  for (const guardian of guardians) {
    const guardianId =
      guardian.kind === "existing"
        ? guardian.id
        : (
            await db.guardian.create({
              data: {
                name: guardian.name,
                surname: guardian.surname,
                email: guardian.email ?? null,
                phone: guardian.phone ?? null,
              },
              select: { id: true },
            })
          ).id;
    await db.memberGuardian.create({ data: { memberId, guardianId } });
  }
};

export const createMember = async (db: Db, body: CreateMemberBody, today: string): Promise<MemberResponse> => {
  requireValidBirthday(body, today);
  const orgId = requireDbId(body.orgId, "Org not found");
  const guardians = resolveGuardians(body.guardians);

  return db.$transaction(async (tx) => {
    const org = await tx.org.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) {
      throw new AppError("NOT_FOUND", 404, "Org not found");
    }
    await requireExistingGuardians(tx, guardians);

    const member = await tx.member.create({
      data: {
        orgId,
        name: body.name,
        surname: body.surname,
        birthday: toDbDate(body.birthday),
        role: DEFAULT_MEMBER_ROLE,
        taxNumber: body.taxNumber ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
      },
      select: { id: true },
    });
    await linkGuardians(tx, member.id, guardians);

    return toMemberResponse(await tx.member.findUniqueOrThrow({ where: { id: member.id }, select: memberSelect }));
  });
};

export const getMember = async (db: Db, memberId: string): Promise<MemberResponse> => {
  const member = await db.member.findUnique({
    where: { id: requireDbId(memberId, "Member not found"), deletedAt: null },
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
export const updateMember = async (
  db: Db,
  memberId: string,
  body: UpdateMemberBody,
  today: string,
): Promise<MemberResponse> => {
  requireValidBirthday(body, today);
  const memberDbId = requireDbId(memberId, "Member not found");
  const guardians = resolveGuardians(body.guardians);

  return db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({ where: { id: memberDbId, deletedAt: null }, select: { role: true } });
    if (!member) {
      throw new AppError("NOT_FOUND", 404, "Member not found");
    }
    if (isLoginRole(member.role) && !body.email) {
      throw new AppError("VALIDATION_ERROR", 400, "A member who logs in needs an email");
    }
    await requireExistingGuardians(tx, guardians);

    await tx.member.update({
      where: { id: memberDbId },
      data: {
        name: body.name,
        surname: body.surname,
        birthday: toDbDate(body.birthday),
        taxNumber: body.taxNumber ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
      },
    });
    await tx.memberGuardian.deleteMany({ where: { memberId: memberDbId } });
    await linkGuardians(tx, memberDbId, guardians);

    return toMemberResponse(await tx.member.findUniqueOrThrow({ where: { id: memberDbId }, select: memberSelect }));
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
  memberId: string,
  actingMemberId: string,
  now: Date,
  today: string,
): Promise<void> => {
  const memberDbId = requireDbId(memberId, "Member not found");
  if (memberDbId === toDbId(actingMemberId)) {
    throw new AppError("FORBIDDEN", 403, "You cannot delete yourself");
  }

  await db.$transaction(async (tx) => {
    const { count } = await tx.member.updateMany({
      where: { id: memberDbId, deletedAt: null },
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
  });
};
