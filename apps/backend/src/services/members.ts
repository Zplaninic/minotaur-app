import {
  ADULT_AGE,
  DEFAULT_MEMBER_ROLE,
  type CreateGuardianBody,
  type CreateMemberBody,
  type ListMembersQuery,
  type ListMembersResponse,
  type MemberResponse,
} from "@repo/shared";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import { guardianSelect, toGuardianResponse } from "./guardians.js";
import { toApiId, toDbId } from "./ids.js";

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

// Birthdays are calendar dates, kept as UTC midnight in a Date.
const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const ageOn = (birthday: string, today: Date): number => {
  const birth = toDbDate(birthday);
  const age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  return beforeBirthday ? age - 1 : age;
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

export const listMembers = async (db: Db, query: ListMembersQuery): Promise<ListMembersResponse> => {
  const [total, members] = await db.$transaction([
    db.member.count(),
    db.member.findMany({
      select: memberSelect,
      orderBy: [{ surname: "asc" }, { name: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { items: members.map(toMemberResponse), page: query.page, pageSize: query.pageSize, total };
};

const requireDbId = (value: string, notFoundMessage: string): number => {
  const dbId = toDbId(value);
  if (dbId === undefined) {
    throw new AppError("NOT_FOUND", 404, notFoundMessage);
  }
  return dbId;
};

export const createMember = async (db: Db, body: CreateMemberBody, today: Date): Promise<MemberResponse> => {
  if (body.guardians.length === 0 && ageOn(body.birthday, today) < ADULT_AGE) {
    throw new AppError("VALIDATION_ERROR", 400, `A member younger than ${ADULT_AGE} needs at least one guardian`);
  }

  const orgId = requireDbId(body.orgId, "Org not found");
  const guardians = body.guardians.map(
    (guardian): ResolvedGuardian =>
      guardian.kind === "existing"
        ? { kind: "existing", id: requireDbId(guardian.guardianId, "Guardian not found") }
        : guardian,
  );
  const existingIds = guardians.flatMap((guardian) => (guardian.kind === "existing" ? [guardian.id] : []));

  return db.$transaction(async (tx) => {
    const org = await tx.org.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) {
      throw new AppError("NOT_FOUND", 404, "Org not found");
    }
    if ((await tx.guardian.count({ where: { id: { in: existingIds } } })) !== existingIds.length) {
      throw new AppError("NOT_FOUND", 404, "Guardian not found");
    }

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

    for (const guardian of guardians) {
      const guardianId =
        guardian.kind === "existing"
          ? guardian.id
          : (
              await tx.guardian.create({
                data: {
                  name: guardian.name,
                  surname: guardian.surname,
                  email: guardian.email ?? null,
                  phone: guardian.phone ?? null,
                },
                select: { id: true },
              })
            ).id;
      await tx.memberGuardian.create({ data: { memberId: member.id, guardianId } });
    }

    return toMemberResponse(await tx.member.findUniqueOrThrow({ where: { id: member.id }, select: memberSelect }));
  });
};
