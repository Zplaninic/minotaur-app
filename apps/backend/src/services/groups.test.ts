import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createGuardian, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { SYSTEM_ACTOR } from "./audit.js";
import {
  addGroupMember,
  archiveGroup,
  createGroup,
  getGroup,
  listGroupMembers,
  listGroups,
  removeGroupMember,
  updateGroup,
} from "./groups.js";
import { setMemberRole } from "./logins.js";

const TODAY = "2026-11-16";

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

const group = (overrides: Partial<Parameters<typeof createGroup>[2]> = {}) => ({
  ownerId: trainerId,
  days: ["monday" as const, "wednesday" as const],
  from: "17:00",
  to: "18:30",
  ageFrom: null,
  ageTo: null,
  ...overrides,
});

describe("createGroup", () => {
  it("creates a group owned by a trainer", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    expect(created).toMatchObject({
      owner: { id: trainerId, name: "Test", surname: "trainer" },
      days: ["monday", "wednesday"],
      from: "17:00",
      to: "18:30",
      ageFrom: null,
      ageTo: null,
      memberCount: 0,
    });
  });

  it("saves an age range open at one end", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group({ ageFrom: 7 }));
    expect(created).toMatchObject({ ageFrom: 7, ageTo: null });
    expect(await getGroup(prisma, created.id)).toMatchObject({ ageFrom: 7, ageTo: null });
  });

  it("returns the days in week order", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group({ days: ["friday", "monday"] }));
    expect(created.days).toEqual(["monday", "friday"]);
  });

  it.each(["admin", "member", "child"] as const)("rejects a %s as owner", async (role) => {
    const { memberId } = await createLoginMember(prisma, orgId, role);
    await expect(createGroup(prisma, SYSTEM_ACTOR, group({ ownerId: String(memberId) }))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(await prisma.group.count()).toBe(0);
  });

  it("rejects an unknown owner", async () => {
    await expect(
      createGroup(prisma, SYSTEM_ACTOR, group({ ownerId: "999999" })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      createGroup(prisma, SYSTEM_ACTOR, group({ ownerId: "abc" })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("updateGroup", () => {
  it("replaces the trainer, days, times and age range", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group({ ageFrom: 7, ageTo: 10 }));
    const other = String((await createLoginMember(prisma, orgId, "trainer", "other@example.com")).memberId);
    const updated = await updateGroup(
      prisma,
      SYSTEM_ACTOR,
      created.id,
      group({ ownerId: other, days: ["friday", "tuesday"], from: "08:00", to: "09:00", ageFrom: null, ageTo: 12 }),
    );
    expect(updated).toMatchObject({
      id: created.id,
      owner: { id: other },
      days: ["tuesday", "friday"],
      from: "08:00",
      to: "09:00",
      ageFrom: null,
      ageTo: 12,
    });
    expect(await getGroup(prisma, created.id)).toEqual(updated);
  });

  it("keeps the group's members", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    await addGroupMember(prisma, SYSTEM_ACTOR, created.id, await addedMember("child", "Ana", "Horvat"), TODAY);
    expect((await updateGroup(prisma, SYSTEM_ACTOR, created.id, group({ ageFrom: 7 }))).memberCount).toBe(1);
  });

  it("rejects an owner who is not a trainer", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    const { memberId } = await createLoginMember(prisma, orgId, "admin", "admin@example.com");
    await expect(
      updateGroup(prisma, SYSTEM_ACTOR, created.id, group({ ownerId: String(memberId) })),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect((await getGroup(prisma, created.id)).owner.id).toBe(trainerId);
  });

  it("rejects an unknown or archived group", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    await archiveGroup(prisma, SYSTEM_ACTOR, created.id, new Date());
    await expect(updateGroup(prisma, SYSTEM_ACTOR, created.id, group())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateGroup(prisma, SYSTEM_ACTOR, "999999", group())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateGroup(prisma, SYSTEM_ACTOR, "abc", group())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("listGroups", () => {
  it("returns groups sorted by owner, then start time", async () => {
    const other = await createLoginMember(prisma, orgId, "trainer", "anna@example.com");
    await prisma.member.update({ where: { id: other.memberId }, data: { surname: "Anić" } });
    await createGroup(prisma, SYSTEM_ACTOR, group({ from: "19:00", to: "20:00" }));
    await createGroup(prisma, SYSTEM_ACTOR, group({ from: "08:00", to: "09:00" }));
    await createGroup(prisma, SYSTEM_ACTOR, group({ ownerId: String(other.memberId) }));

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
    await createGroup(prisma, SYSTEM_ACTOR, group());
    await expect(prisma.member.delete({ where: { id: Number(trainerId) } })).rejects.toThrow();
    expect(await prisma.group.count()).toBe(1);
  });

  it("cannot be moved to another role", async () => {
    await createGroup(prisma, SYSTEM_ACTOR, group());
    await expect(
      setMemberRole(prisma, SYSTEM_ACTOR, Number(trainerId), "member", TODAY),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await prisma.member.findUniqueOrThrow({ where: { id: Number(trainerId) } })).role).toBe("trainer");
  });
});

describe("a trainer without groups", () => {
  it("can be moved to another role", async () => {
    await setMemberRole(prisma, SYSTEM_ACTOR, Number(trainerId), "member", TODAY);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: Number(trainerId) } })).role).toBe("member");
  });
});

const addedMember = async (role: "child" | "member", name: string, surname: string): Promise<string> => {
  const { memberId } = await createLoginMember(prisma, orgId, role, `${name}.${surname}@example.com`);
  await prisma.member.update({ where: { id: memberId }, data: { name, surname } });
  return String(memberId);
};

describe("getGroup", () => {
  it("returns the group with its member count", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    await addGroupMember(prisma, SYSTEM_ACTOR, created.id, await addedMember("child", "Ana", "Horvat"), TODAY);
    expect(await getGroup(prisma, created.id)).toMatchObject({ id: created.id, memberCount: 1 });
  });

  it("rejects an unknown group", async () => {
    await expect(getGroup(prisma, "999999")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getGroup(prisma, "abc")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("addGroupMember", () => {
  it.each(["child", "member"] as const)("adds a %s", async (role) => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    const memberId = await addedMember(role, "Ana", "Horvat");
    await addGroupMember(prisma, SYSTEM_ACTOR, created.id, memberId, TODAY);
    expect((await listGroupMembers(prisma, created.id)).items).toEqual([
      {
        id: memberId,
        name: "Ana",
        surname: "Horvat",
        birthday: "1990-01-01",
        email: "Ana.Horvat@example.com",
        phone: null,
        guardians: [],
      },
    ]);
  });

  it("lists a member's guardians", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    const memberId = await addedMember("child", "Ana", "Horvat");
    const guardianId = await createGuardian(prisma);
    await prisma.memberGuardian.create({ data: { memberId: Number(memberId), guardianId: Number(guardianId) } });
    await addGroupMember(prisma, SYSTEM_ACTOR, created.id, memberId, TODAY);
    expect((await listGroupMembers(prisma, created.id)).items[0]?.guardians).toEqual([
      { id: guardianId, name: "Iva", surname: "Horvat", email: null, phone: null },
    ]);
  });

  it("changes nothing when the member is already in the group", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    const memberId = await addedMember("child", "Ana", "Horvat");
    await addGroupMember(prisma, SYSTEM_ACTOR, created.id, memberId, TODAY);
    await addGroupMember(prisma, SYSTEM_ACTOR, created.id, memberId, TODAY);
    expect(await prisma.groupMember.count()).toBe(1);
  });

  it("lets a member be in several groups", async () => {
    const first = await createGroup(prisma, SYSTEM_ACTOR, group());
    const second = await createGroup(prisma, SYSTEM_ACTOR, group({ from: "19:00", to: "20:00" }));
    const memberId = await addedMember("child", "Ana", "Horvat");
    await addGroupMember(prisma, SYSTEM_ACTOR, first.id, memberId, TODAY);
    await addGroupMember(prisma, SYSTEM_ACTOR, second.id, memberId, TODAY);
    expect(await prisma.groupMember.count({ where: { memberId: Number(memberId) } })).toBe(2);
  });

  it.each(["trainer", "admin"] as const)("rejects a %s", async (role) => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    const { memberId } = await createLoginMember(prisma, orgId, role, "other@example.com");
    await expect(addGroupMember(prisma, SYSTEM_ACTOR, created.id, String(memberId), TODAY)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(await prisma.groupMember.count()).toBe(0);
  });

  it("rejects an unknown group or member", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    const memberId = await addedMember("child", "Ana", "Horvat");
    await expect(
      addGroupMember(prisma, SYSTEM_ACTOR, "999999", memberId, TODAY),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      addGroupMember(prisma, SYSTEM_ACTOR, created.id, "999999", TODAY),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      addGroupMember(prisma, SYSTEM_ACTOR, created.id, "abc", TODAY),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("listGroupMembers", () => {
  it("returns the members sorted by surname, then name", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    for (const [name, surname] of [["Marko", "Novak"], ["Iva", "Horvat"], ["Ana", "Horvat"]] as const) {
      await addGroupMember(prisma, SYSTEM_ACTOR, created.id, await addedMember("child", name, surname), TODAY);
    }
    const { items } = await listGroupMembers(prisma, created.id);
    expect(items.map((item) => `${item.surname} ${item.name}`)).toEqual(["Horvat Ana", "Horvat Iva", "Novak Marko"]);
  });

  it("rejects an unknown group", async () => {
    await expect(listGroupMembers(prisma, "999999")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("removeGroupMember", () => {
  it("removes the member from that group only", async () => {
    const first = await createGroup(prisma, SYSTEM_ACTOR, group());
    const second = await createGroup(prisma, SYSTEM_ACTOR, group({ from: "19:00", to: "20:00" }));
    const memberId = await addedMember("child", "Ana", "Horvat");
    await addGroupMember(prisma, SYSTEM_ACTOR, first.id, memberId, TODAY);
    await addGroupMember(prisma, SYSTEM_ACTOR, second.id, memberId, TODAY);

    await removeGroupMember(prisma, SYSTEM_ACTOR, first.id, memberId, TODAY);
    expect((await listGroupMembers(prisma, first.id)).items).toEqual([]);
    expect((await listGroupMembers(prisma, second.id)).items).toHaveLength(1);
  });

  it("changes nothing when the member is not in the group", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    await expect(removeGroupMember(prisma, SYSTEM_ACTOR, created.id, "999999", TODAY)).resolves.toBeUndefined();
  });

  it("rejects an unknown group", async () => {
    await expect(
      removeGroupMember(prisma, SYSTEM_ACTOR, "999999", "1", TODAY),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("a member in a group", () => {
  it("leaves the group when deleted", async () => {
    const created = await createGroup(prisma, SYSTEM_ACTOR, group());
    const memberId = await addedMember("child", "Ana", "Horvat");
    await addGroupMember(prisma, SYSTEM_ACTOR, created.id, memberId, TODAY);
    await prisma.member.delete({ where: { id: Number(memberId) } });
    expect((await getGroup(prisma, created.id)).memberCount).toBe(0);
  });
});
