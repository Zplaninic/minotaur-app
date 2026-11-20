import {
  email as emailSchema,
  GROUP_OWNER_ROLE,
  isGroupMemberRole,
  newPassword,
  personName,
  type MemberRole,
} from "@repo/shared";
import { isLoginRole, type LoginRole } from "@repo/shared/auth";
import { hashPassword } from "../auth/password.js";
import { deleteMemberSessions } from "../auth/sessions.js";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import { recordEvent, type Actor } from "./audit.js";
import { toDbDate } from "./dates.js";
import { leaveGroups } from "./groups.js";

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

// Gives an existing member a role that can log in and a password. Trainers
// and admins do not train in groups, so the member leaves theirs. today is
// YYYY-MM-DD at the gym.
export const createLoginForMember = async (
  db: Db,
  actor: Actor,
  memberId: number,
  role: LoginRole,
  password: string,
  today: string,
): Promise<void> => {
  const passwordHash = await hashPassword(validPassword(password));
  await db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: memberId, deletedAt: null },
      select: { email: true, role: true },
    });
    if (!member) {
      throw new AppError("NOT_FOUND", 404, "Member not found");
    }
    if (!member.email) {
      throw new AppError("VALIDATION_ERROR", 400, "The member has no email, which is needed to log in");
    }
    await tx.member.update({ where: { id: memberId }, data: { role } });
    await leaveGroups(tx, memberId, today);
    await tx.login.upsert({ where: { memberId }, create: { memberId, passwordHash }, update: { passwordHash } });
    await recordEvent(tx, actor, {
      action: "login_created",
      memberId,
      changes: { role: { from: member.role, to: role }, password: { changed: true } },
    });
  });
};

// Creates the member and their login in one go; used for the first admin.
export const createMemberWithLogin = async (
  db: Db,
  actor: Actor,
  input: NewLoginMember,
  role: LoginRole,
  password: string,
): Promise<number> => {
  const passwordHash = await hashPassword(validPassword(password));
  return db.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        orgId: input.orgId,
        name: personName.parse(input.name),
        surname: personName.parse(input.surname),
        birthday: toDbDate(input.birthday),
        email: emailSchema.parse(input.email),
        role,
        login: { create: { passwordHash } },
      },
      select: { id: true },
    });
    await recordEvent(tx, actor, { action: "member_created", memberId: member.id });
    await recordEvent(tx, actor, {
      action: "login_created",
      memberId: member.id,
      changes: { role: { from: null, to: role }, password: { changed: true } },
    });
    return member.id;
  });
};

// A new password ends every session, so a leaked password stops working everywhere.
export const setLoginPassword = async (db: Db, actor: Actor, memberId: number, password: string): Promise<void> => {
  const passwordHash = await hashPassword(validPassword(password));
  await db.$transaction(async (tx) => {
    await tx.login.update({ where: { memberId }, data: { passwordHash } });
    await deleteMemberSessions(tx, memberId);
    await recordEvent(tx, actor, { action: "login_password_set", memberId, changes: { password: { changed: true } } });
  });
};

// Moving someone to a role that cannot log in also ends their sessions.
// A group's owner must stay a trainer, so a trainer who owns groups keeps the role.
// Only children and members train in groups, so anyone else leaves theirs.
// today is YYYY-MM-DD at the gym.
export const setMemberRole = async (
  db: Db,
  actor: Actor,
  memberId: number,
  role: MemberRole,
  today: string,
): Promise<void> => {
  await db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({ where: { id: memberId, deletedAt: null }, select: { role: true } });
    if (!member) {
      throw new AppError("NOT_FOUND", 404, "Member not found");
    }
    if (role !== GROUP_OWNER_ROLE && (await tx.group.count({ where: { ownerId: memberId, deletedAt: null } })) > 0) {
      throw new AppError("CONFLICT", 409, "The member owns groups; give them to another trainer first");
    }
    await tx.member.update({ where: { id: memberId }, data: { role } });
    if (!isGroupMemberRole(role)) {
      await leaveGroups(tx, memberId, today);
    }
    if (!isLoginRole(role)) {
      await deleteMemberSessions(tx, memberId);
    }
    if (member.role !== role) {
      await recordEvent(
        tx,
        actor,
        { action: "member_role_changed", memberId, changes: { role: { from: member.role, to: role } } },
      );
    }
  });
};
