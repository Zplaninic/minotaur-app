import type { Db } from "../src/db/client.js";

// Empties every table, children first. Only ever runs against the test database.
export const resetDb = async (db: Db): Promise<void> => {
  await db.$transaction([
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
