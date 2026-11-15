import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createSession, SESSION_LIFETIME_MS, validateSession } from "./sessions.js";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("passwords", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same password here")).not.toBe(await hashPassword("same password here"));
  });

  it("rejects a malformed stored hash", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });
});

describe("sessions", () => {
  let memberId: number;

  beforeEach(async () => {
    await resetDb(prisma);
    ({ memberId } = await createLoginMember(prisma, await createOrg(prisma), "admin"));
  });

  it("stores only a hash of the token", async () => {
    const { token } = await createSession(prisma, memberId, new Date());
    const stored = await prisma.session.findFirstOrThrow();
    expect(stored.id).not.toBe(token);
  });

  it("extends a session that is used close to its end", async () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const { token, expiresAt } = await createSession(prisma, memberId, start);

    const early = await validateSession(prisma, token, new Date(start.getTime() + 1000));
    expect(early?.renewed).toBe(false);

    const late = new Date(expiresAt.getTime() - 1000);
    const renewed = await validateSession(prisma, token, late);
    expect(renewed?.renewed).toBe(true);
    expect(renewed?.expiresAt.getTime()).toBe(late.getTime() + SESSION_LIFETIME_MS);
  });

  it("returns null for an unknown token", async () => {
    expect(await validateSession(prisma, "unknown", new Date())).toBeNull();
  });
});
