import { email as emailSchema, newPassword, personName, type MemberRole } from "@repo/shared";
import { isLoginRole, type LoginRole } from "@repo/shared/auth";
import { hashPassword } from "../auth/password.js";
import { deleteMemberSessions } from "../auth/sessions.js";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";

// Used by the backend commands until there are screens for managing logins.

export type NewLoginMember = {
  orgId: number;
  name: string;
  surname: string;
  birthday: string;
  email: string;
};

const validPassword = (password: string): string => {
  const result = newPassword.safeParse(password);
  if (!result.success) {
    throw new AppError("VALIDATION_ERROR", 400, "The password must be 12 to 128 characters long");
  }
  return result.data;
};

// Gives an existing member a role that can log in and a password.
export const createLoginForMember = async (
  db: Db,
  memberId: number,
  role: LoginRole,
  password: string,
): Promise<void> => {
  const passwordHash = await hashPassword(validPassword(password));
  await db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({ where: { id: memberId }, select: { email: true } });
    if (!member) {
      throw new AppError("NOT_FOUND", 404, "Member not found");
    }
    if (!member.email) {
      throw new AppError("VALIDATION_ERROR", 400, "The member has no email, which is needed to log in");
    }
    await tx.member.update({ where: { id: memberId }, data: { role } });
    await tx.login.upsert({ where: { memberId }, create: { memberId, passwordHash }, update: { passwordHash } });
  });
};

// Creates the member and their login in one go; used for the first admin.
export const createMemberWithLogin = async (
  db: Db,
  input: NewLoginMember,
  role: LoginRole,
  password: string,
): Promise<number> => {
  const passwordHash = await hashPassword(validPassword(password));
  const member = await db.member.create({
    data: {
      orgId: input.orgId,
      name: personName.parse(input.name),
      surname: personName.parse(input.surname),
      birthday: new Date(`${input.birthday}T00:00:00.000Z`),
      email: emailSchema.parse(input.email),
      role,
      login: { create: { passwordHash } },
    },
    select: { id: true },
  });
  return member.id;
};

// A new password ends every session, so a leaked password stops working everywhere.
export const setLoginPassword = async (db: Db, memberId: number, password: string): Promise<void> => {
  const passwordHash = await hashPassword(validPassword(password));
  await db.$transaction(async (tx) => {
    await tx.login.update({ where: { memberId }, data: { passwordHash } });
    await deleteMemberSessions(tx, memberId);
  });
};

// Moving someone to a role that cannot log in also ends their sessions.
export const setMemberRole = async (db: Db, memberId: number, role: MemberRole): Promise<void> => {
  await db.member.update({ where: { id: memberId }, data: { role } });
  if (!isLoginRole(role)) {
    await deleteMemberSessions(db, memberId);
  }
};
