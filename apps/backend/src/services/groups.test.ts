import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { createGroup, listGroups } from "./groups.js";
import { setMemberRole } from "./logins.js";

let orgId: string;
let trainerId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
  trainerId = String((await createLoginMember(prisma, orgId, "trainer")).memberId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const group = (overrides: Partial<Parameters<typeof createGroup>[1]> = {}) => ({
  ownerId: trainerId,
  days: ["monday" as const, "wednesday" as const],
  from: "17:00",
  to: "18:30",
  ...overrides,
});

describe("createGroup", () => {
  it("creates a group owned by a trainer", async () => {
    const created = await createGroup(prisma, group());
    expect(created).toMatchObject({
      owner: { id: trainerId, name: "Test", surname: "trainer" },
      days: ["monday", "wednesday"],
      from: "17:00",
      to: "18:30",
    });
  });

  it("returns the days in week order", async () => {
    const created = await createGroup(prisma, group({ days: ["friday", "monday"] }));
    expect(created.days).toEqual(["monday", "friday"]);
  });

  it.each(["admin", "member", "child"] as const)("rejects a %s as owner", async (role) => {
    const { memberId } = await createLoginMember(prisma, orgId, role);
    await expect(createGroup(prisma, group({ ownerId: String(memberId) }))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(await prisma.group.count()).toBe(0);
  });

  it("rejects an unknown owner", async () => {
    await expect(createGroup(prisma, group({ ownerId: "999999" }))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createGroup(prisma, group({ ownerId: "abc" }))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("listGroups", () => {
  it("returns groups sorted by owner, then start time", async () => {
    const other = await createLoginMember(prisma, orgId, "trainer", "anna@example.com");
    await prisma.member.update({ where: { id: other.memberId }, data: { surname: "Anić" } });
    await createGroup(prisma, group({ from: "19:00", to: "20:00" }));
    await createGroup(prisma, group({ from: "08:00", to: "09:00" }));
    await createGroup(prisma, group({ ownerId: String(other.memberId) }));

    const { items } = await listGroups(prisma);
    expect(items.map((item) => `${item.owner.surname} ${item.from}`)).toEqual([
      "Anić 17:00",
      "trainer 08:00",
      "trainer 19:00",
    ]);
  });
});

describe("a trainer who owns groups", () => {
  it("cannot be deleted", async () => {
    await createGroup(prisma, group());
    await expect(prisma.member.delete({ where: { id: Number(trainerId) } })).rejects.toThrow();
    expect(await prisma.group.count()).toBe(1);
  });

  it("cannot be moved to another role", async () => {
    await createGroup(prisma, group());
    await expect(setMemberRole(prisma, Number(trainerId), "member")).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await prisma.member.findUniqueOrThrow({ where: { id: Number(trainerId) } })).role).toBe("trainer");
  });
});

describe("a trainer without groups", () => {
  it("can be moved to another role", async () => {
    await setMemberRole(prisma, Number(trainerId), "member");
    expect((await prisma.member.findUniqueOrThrow({ where: { id: Number(trainerId) } })).role).toBe("member");
  });
});
