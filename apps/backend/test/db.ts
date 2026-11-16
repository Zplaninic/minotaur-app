import type { MemberRole } from "@repo/shared";
import { hashPassword } from "../src/auth/password.js";
import { createSession } from "../src/auth/sessions.js";
import type { Db } from "../src/db/client.js";

// Empties every table, children first. Only ever runs against the test database.
export const resetDb = async (db: Db): Promise<void> => {
  await db.$transaction([
    db.groupMember.deleteMany(),
    db.group.deleteMany(),
    db.session.deleteMany(),
    db.login.deleteMany(),
    db.memberGuardian.deleteMany(),
    db.member.deleteMany(),
    db.guardian.deleteMany(),
    db.org.deleteMany(),
  ]);
};

export const createOrg = async (db: Db, name = "SPK Minotaur"): Promise<string> => {
  const org = await db.org.create({
    data: { name, contactName: "Contact", email: "org@example.com" },
    select: { id: true },
  });
  return String(org.id);
};

export const createGuardian = async (db: Db, name = "Iva", surname = "Horvat"): Promise<string> => {
  const guardian = await db.guardian.create({ data: { name, surname }, select: { id: true } });
  return String(guardian.id);
};

export const TEST_PASSWORD = "correct horse battery";

// A member with a password. Logging in still requires a login role.
export const createLoginMember = async (
  db: Db,
  orgId: string,
  role: MemberRole,
  email = `${role}@example.com`,
): Promise<{ memberId: number; email: string }> => {
  const member = await db.member.create({
    data: {
      orgId: Number(orgId),
      name: "Test",
      surname: role,
      birthday: new Date("1990-01-01T00:00:00.000Z"),
      email,
      role,
      login: { create: { passwordHash: await hashPassword(TEST_PASSWORD) } },
    },
    select: { id: true },
  });
  return { memberId: member.id, email };
};

// Request headers of a logged-in member, without going through the
// rate-limited login route.
export const authHeaders = async (db: Db, memberId: number): Promise<{ authorization: string }> => {
  const { token } = await createSession(db, memberId, new Date());
  return { authorization: `Bearer ${token}` };
};

export const loggedInAs = async (db: Db, orgId: string, role: MemberRole) => {
  const { memberId } = await createLoginMember(db, orgId, role);
  return authHeaders(db, memberId);
};
