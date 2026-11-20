import type { MemberRole } from "@repo/shared";
import { isLoginRole } from "@repo/shared/auth";
import { createHash, randomBytes } from "node:crypto";
import type { Db } from "../db/client.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_LIFETIME_MS = 30 * DAY_MS;
// A session used with less than this left is extended to the full lifetime again.
export const SESSION_RENEW_WITHIN_MS = 15 * DAY_MS;

export const SESSION_COOKIE = "session";

// Only the hash is stored, so the database never holds a usable token.
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export type SessionMember = {
  id: number;
  name: string;
  surname: string;
  email: string | null;
  role: MemberRole;
  org: { id: number; name: string };
};

export const sessionMemberSelect = {
  id: true,
  name: true,
  surname: true,
  email: true,
  role: true,
  org: { select: { id: true, name: true } },
} as const;

export type ValidSession = {
  member: SessionMember;
  expiresAt: Date;
  renewed: boolean;
};

export const createSession = async (
  db: Db,
  memberId: number,
  now: Date,
): Promise<{ token: string; expiresAt: Date }> => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
  await db.session.create({ data: { id: hashToken(token), memberId, expiresAt } });
  return { token, expiresAt };
};

// The session behind a token, with the member's current role; null when the
// token is unknown, expired, or the member may no longer log in.
export const validateSession = async (db: Db, token: string, now: Date): Promise<ValidSession | null> => {
  const id = hashToken(token);
  const session = await db.session.findUnique({
    where: { id },
    select: {
      expiresAt: true,
      member: { select: sessionMemberSelect },
    },
  });
  if (!session) {
    return null;
  }
  if (session.expiresAt <= now) {
    await db.session.deleteMany({ where: { id } });
    return null;
  }
  if (!isLoginRole(session.member.role)) {
    return null;
  }

  if (session.expiresAt.getTime() - now.getTime() < SESSION_RENEW_WITHIN_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
    await db.session.update({ where: { id }, data: { expiresAt } });
    return { member: session.member, expiresAt, renewed: true };
  }
  return { member: session.member, expiresAt: session.expiresAt, renewed: false };
};

export const deleteSession = async (db: Db, token: string): Promise<void> => {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
};

// Takes only the session table, so it also works inside a transaction.
export const deleteMemberSessions = async (db: Pick<Db, "session">, memberId: number): Promise<void> => {
  await db.session.deleteMany({ where: { memberId } });
};
