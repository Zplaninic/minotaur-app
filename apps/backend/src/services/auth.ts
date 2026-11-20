import type { LoginBody, MeResponse } from "@repo/shared";
import { LOGIN_ROLES } from "@repo/shared/auth";
import { unusedPasswordHash, verifyPassword } from "../auth/password.js";
import { createSession, sessionMemberSelect, type SessionMember } from "../auth/sessions.js";
import type { Db } from "../db/client.js";
import { AppError } from "../errors.js";
import { toApiId } from "./ids.js";

export const toMeResponse = (member: SessionMember): MeResponse => ({
  memberId: toApiId(member.id),
  name: member.name,
  surname: member.surname,
  email: member.email ?? "",
  role: member.role,
  org: { id: toApiId(member.org.id), name: member.org.name },
});

export type LoginResult = { me: MeResponse; token: string; expiresAt: Date };

// One answer for every failure, so a caller cannot tell a wrong email from a
// wrong password or from a member who may not log in.
const invalidCredentials = () => new AppError("UNAUTHORIZED", 401, "Email or password is wrong");

export const login = async (db: Db, body: Pick<LoginBody, "email" | "password">, now: Date): Promise<LoginResult> => {
  const member = await db.member.findFirst({
    where: { email: body.email, deletedAt: null, role: { in: [...LOGIN_ROLES] }, login: { isNot: null } },
    select: { ...sessionMemberSelect, login: { select: { passwordHash: true } } },
  });

  const valid = await verifyPassword(body.password, member?.login?.passwordHash ?? unusedPasswordHash);
  if (!member || !valid) {
    throw invalidCredentials();
  }

  const { token, expiresAt } = await createSession(db, member.id, now);
  return { me: toMeResponse(member), token, expiresAt };
};
