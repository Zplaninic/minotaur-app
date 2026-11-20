import type { ImportMemberRow } from "@repo/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { AppError } from "../errors.js";
import { SYSTEM_ACTOR } from "./audit.js";
import { importMembers } from "./memberImport.js";
import { archiveMember, createMember } from "./members.js";
import { createSubscription } from "./subscriptions.js";

// The day at the gym.
const today = "2026-11-15";

let orgId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const child = (overrides: Partial<ImportMemberRow> = {}): ImportMemberRow => ({
  name: "Lovro",
  surname: "Golub",
  birthday: "2016-04-02",
  guardianName: "Iva Golub",
  guardianEmail: "iva@example.com",
  ...overrides,
});

const run = (rows: ImportMemberRow[], dryRun = false) =>
  importMembers(prisma, SYSTEM_ACTOR, { orgId, rows, dryRun }, today);

const membersWithGuardians = () =>
  prisma.member.findMany({
    orderBy: { id: "asc" },
    select: { name: true, role: true, guardians: { select: { guardian: { select: { name: true, surname: true } } } } },
  });

describe("importMembers", () => {
  it("creates children with their guardian, who has no surname", async () => {
    const result = await run([child()]);
    expect(result).toEqual({ imported: true, rows: [{ status: "create", problems: [] }] });
    expect(await membersWithGuardians()).toEqual([
      { name: "Lovro", role: "child", guardians: [{ guardian: { name: "Iva Golub", surname: null } }] },
    ]);
    expect(await prisma.auditEvent.count({ where: { action: "member_created" } })).toBe(1);
  });

  it("writes nothing on a dry run", async () => {
    const result = await run([child()], true);
    expect(result).toEqual({ imported: false, rows: [{ status: "create", problems: [] }] });
    expect(await prisma.member.count()).toBe(0);
  });

  it("shares a guardian between siblings and links an existing guardian by email", async () => {
    const existing = await prisma.guardian.create({
      data: { name: "Marko", surname: "Babić", email: "marko@example.com" },
      select: { id: true },
    });
    await run([
      child(),
      child({ name: "Mia" }),
      child({ name: "Ena", surname: "Babić", guardianName: "Marko B.", guardianEmail: "marko@example.com" }),
    ]);
    const links = await prisma.memberGuardian.findMany({ select: { guardianId: true }, orderBy: { memberId: "asc" } });
    expect(links[0]?.guardianId).toBe(links[1]?.guardianId);
    expect(links[2]?.guardianId).toBe(existing.id);
    expect(await prisma.guardian.count()).toBe(2);
  });

  it("skips active members and repeated rows, but not archived members", async () => {
    await createMember(prisma, SYSTEM_ACTOR, { orgId, name: "ana", surname: "HORVAT", birthday: "1990-01-01", guardians: [] }, today);
    const archived = await createMember(
      prisma,
      SYSTEM_ACTOR,
      { orgId, name: "Ivo", surname: "Kos", guardians: [] },
      today,
    );
    await archiveMember(prisma, SYSTEM_ACTOR, archived.id, new Date("2026-11-15T12:00:00.000Z"), today);

    const result = await run([
      { name: "Ana", surname: "Horvat", birthday: "1990-01-01" },
      { name: "Ivo", surname: "Kos" },
      { name: "Ivo", surname: "Kos" },
      { name: "Ana", surname: "Horvat", birthday: "1991-01-01" },
    ]);
    expect(result.rows.map((row) => row.status)).toEqual(["duplicate", "create", "duplicate", "create"]);
    expect(await prisma.member.count({ where: { deletedAt: null } })).toBe(3);
  });

  it("imports nothing when a row is invalid", async () => {
    const result = await run([
      child(),
      { name: "Mia", surname: "Golub", birthday: "2016-04-02" },
      child({ name: "Ena", birthday: "2026-11-16", subscription: "Unknown" }),
    ]);
    expect(result).toEqual({
      imported: false,
      rows: [
        { status: "create", problems: [] },
        { status: "invalid", problems: ["guardianRequired"] },
        { status: "invalid", problems: ["birthdayInFuture", "subscriptionNotFound"] },
      ],
    });
    expect(await prisma.member.count()).toBe(0);
  });

  it("accepts an adult or a member without a birthday without a guardian", async () => {
    const result = await run([
      { name: "Marko", surname: "Babić", birthday: "2008-11-15" },
      { name: "Ena", surname: "Babić" },
    ]);
    expect(result.imported).toBe(true);
  });

  it("sets the subscription on the member's current month", async () => {
    const subscription = await createSubscription(prisma, SYSTEM_ACTOR, {
      name: "Kids 2x",
      sessionsPerWeek: 2,
      price: 4500,
    });
    await run([child({ subscription: "Kids 2x" }), child({ name: "Mia" })]);
    const months = await prisma.memberMonth.findMany({
      select: { month: true, subscriptionId: true, subscriptionPrice: true, subscriptionSessionsPerWeek: true, paid: true },
    });
    expect(months).toEqual([
      {
        month: new Date("2026-11-01T00:00:00.000Z"),
        subscriptionId: Number(subscription.id),
        subscriptionPrice: 4500,
        subscriptionSessionsPerWeek: 2,
        paid: false,
      },
    ]);
    expect(await prisma.auditEvent.count({ where: { action: "month_subscription_set" } })).toBe(1);
  });

  it("answers NOT_FOUND for an unknown org", async () => {
    await expect(
      importMembers(prisma, SYSTEM_ACTOR, { orgId: "999", rows: [child()], dryRun: true }, today),
    ).rejects.toThrow(AppError);
  });
});
