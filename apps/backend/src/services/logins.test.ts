import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb, TEST_PASSWORD } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { SYSTEM_ACTOR } from "./audit.js";
import { login } from "./auth.js";
import { addGroupMember, createGroup, listGroupMembers } from "./groups.js";
import { createLoginForMember, createMemberWithLogin, setLoginPassword, setMemberRole } from "./logins.js";

const now = new Date();
const NEW_PASSWORD = "a brand new password";
const TODAY = "2026-11-16";

let orgId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const createMember = (email: string | null) =>
  prisma.member.create({
    data: { orgId: Number(orgId), name: "Iva", surname: "Horvat", birthday: new Date("1985-04-02"), email },
    select: { id: true },
  });

describe("createLoginForMember", () => {
  it("makes an existing member a trainer who logs in with their member email", async () => {
    const { id } = await createMember("iva@example.com");
    await createLoginForMember(prisma, SYSTEM_ACTOR, id, "trainer", NEW_PASSWORD, TODAY);

    const result = await login(prisma, { email: "iva@example.com", password: NEW_PASSWORD }, now);
    expect(result.me).toMatchObject({ memberId: String(id), role: "trainer" });
  });

  it("refuses a member without an email", async () => {
    const { id } = await createMember(null);
    await expect(createLoginForMember(prisma, SYSTEM_ACTOR, id, "trainer", NEW_PASSWORD, TODAY)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("refuses a password shorter than 12 characters", async () => {
    const { id } = await createMember("iva@example.com");
    await expect(createLoginForMember(prisma, SYSTEM_ACTOR, id, "trainer", "short", TODAY)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("refuses a second trainer or admin with the same email", async () => {
    await createLoginMember(prisma, orgId, "admin", "same@example.com");
    const { id } = await createMember("same@example.com");
    await expect(
      createLoginForMember(prisma, SYSTEM_ACTOR, id, "trainer", NEW_PASSWORD, TODAY),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("createMemberWithLogin", () => {
  it("creates the first admin, with the email stored lowercase", async () => {
    const memberId = await createMemberWithLogin(
      prisma,
      SYSTEM_ACTOR,
      { orgId: Number(orgId), name: "Zvonimir", surname: "Admin", birthday: "1985-04-02", email: "Admin@Example.com" },
      "admin",
      NEW_PASSWORD,
    );
    const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
    expect(member).toMatchObject({ email: "admin@example.com", role: "admin" });
  });
});

describe("setLoginPassword", () => {
  it("replaces the password and ends existing sessions", async () => {
    const { memberId, email } = await createLoginMember(prisma, orgId, "admin");
    await authHeaders(prisma, memberId);
    await setLoginPassword(prisma, SYSTEM_ACTOR, memberId, NEW_PASSWORD);

    expect(await prisma.session.count()).toBe(0);
    await expect(login(prisma, { email, password: TEST_PASSWORD }, now)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(login(prisma, { email, password: NEW_PASSWORD }, now)).resolves.toBeDefined();
  });
});

describe("setMemberRole", () => {
  it("takes a member who becomes a trainer out of their groups", async () => {
    const owner = await createLoginMember(prisma, orgId, "trainer", "owner@example.com");
    const group = await createGroup(prisma, SYSTEM_ACTOR, {
      ownerId: String(owner.memberId),
      days: ["monday"],
      from: "18:00",
      to: "19:00",
      ageFrom: null,
      ageTo: null,
    });
    const { memberId } = await createLoginMember(prisma, orgId, "child");
    await addGroupMember(prisma, SYSTEM_ACTOR, group.id, String(memberId), TODAY);

    await setMemberRole(prisma, SYSTEM_ACTOR, memberId, "trainer", TODAY);
    expect((await listGroupMembers(prisma, group.id)).items).toEqual([]);
  });

  it("answers NOT_FOUND for an archived member", async () => {
    const { memberId } = await createLoginMember(prisma, orgId, "child");
    await prisma.member.update({ where: { id: memberId }, data: { deletedAt: now } });
    await expect(
      setMemberRole(prisma, SYSTEM_ACTOR, memberId, "member", TODAY),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("ends the sessions of someone who can no longer log in", async () => {
    const { memberId } = await createLoginMember(prisma, orgId, "trainer");
    await authHeaders(prisma, memberId);
    await setMemberRole(prisma, SYSTEM_ACTOR, memberId, "member", TODAY);
    expect(await prisma.session.count()).toBe(0);
  });
});
