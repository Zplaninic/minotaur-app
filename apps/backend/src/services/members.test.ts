import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createGuardian, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { AppError } from "../errors.js";
import { addTrainingSession, getGroupAttendance, markAttendance } from "./attendance.js";
import { addGroupMember, archiveGroup, createGroup, listGroupMembers } from "./groups.js";
import { ageOn, archiveMember, createMember, getMember, listMembers, updateMember } from "./members.js";

const today = new Date("2026-11-15T12:00:00.000Z");

let orgId: string;

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const adult = (overrides: Partial<Parameters<typeof createMember>[1]> = {}) => ({
  orgId,
  name: "Marko",
  surname: "Babić",
  birthday: "1990-05-01",
  guardians: [],
  ...overrides,
});

describe("ageOn", () => {
  it("counts a birthday later this year as not yet reached", () => {
    expect(ageOn("2008-11-16", today)).toBe(17);
  });

  it("counts a birthday today as reached", () => {
    expect(ageOn("2008-11-15", today)).toBe(18);
  });
});

describe("createMember", () => {
  it("creates an adult without guardians", async () => {
    const member = await createMember(prisma, adult({ email: "marko@example.com" }), today);
    expect(member).toMatchObject({
      orgId,
      name: "Marko",
      surname: "Babić",
      birthday: "1990-05-01",
      taxNumber: null,
      email: "marko@example.com",
      phone: null,
      guardians: [],
    });
  });

  it("creates a minor with a new and an existing guardian in one go", async () => {
    const existingId = await createGuardian(prisma, "Ivan", "Horvat");
    const member = await createMember(
      prisma,
      adult({
        name: "Ana",
        surname: "Horvat",
        birthday: "2014-03-12",
        guardians: [
          { kind: "existing", guardianId: existingId },
          { kind: "new", name: "Iva", surname: "Horvat", phone: "+385 91 123 4567" },
        ],
      }),
      today,
    );
    expect(member.guardians.map((guardian) => guardian.name)).toEqual(["Iva", "Ivan"]);
    expect(await prisma.guardian.count()).toBe(2);
  });

  it("rejects a minor without guardians", async () => {
    await expect(createMember(prisma, adult({ birthday: "2014-03-12" }), today)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects an unknown org", async () => {
    await expect(createMember(prisma, adult({ orgId: "999999" }), today)).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an unknown guardian and creates nothing", async () => {
    const body = adult({
      guardians: [
        { kind: "new", name: "Iva", surname: "Horvat" },
        { kind: "existing", guardianId: "999999" },
      ],
    });
    await expect(createMember(prisma, body, today)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.member.count()).toBe(0);
    expect(await prisma.guardian.count()).toBe(0);
  });

  it("rejects a tax number that is already used", async () => {
    await createMember(prisma, adult({ taxNumber: "01234567890" }), today);
    await expect(createMember(prisma, adult({ taxNumber: "01234567890" }), today)).rejects.toMatchObject({
      code: "P2002",
    });
  });
});

describe("listMembers", () => {
  it("returns members sorted by surname and name, one page at a time", async () => {
    await createMember(prisma, adult({ name: "Luka", surname: "Zorić" }), today);
    await createMember(prisma, adult({ name: "Ana", surname: "Babić" }), today);
    await createMember(prisma, adult({ name: "Marko", surname: "Babić" }), today);

    const first = await listMembers(prisma, { page: 1, pageSize: 2 });
    expect(first.total).toBe(3);
    expect(first.items.map((member) => member.name)).toEqual(["Ana", "Marko"]);

    const second = await listMembers(prisma, { page: 2, pageSize: 2 });
    expect(second.items.map((member) => member.name)).toEqual(["Luka"]);
  });
});

describe("updateMember", () => {
  const edit: Parameters<typeof updateMember>[2] = {
    name: "Marko",
    surname: "Babić",
    birthday: "1990-05-01",
    guardians: [],
  };

  it("replaces the fields and clears the ones left out", async () => {
    const created = await createMember(prisma, adult({ taxNumber: "12345678901", phone: "+385 91 111 2222" }), today);
    const updated = await updateMember(
      prisma,
      created.id,
      { ...edit, name: "Mario", email: "mario@example.com" },
      today,
    );
    expect(updated).toMatchObject({ name: "Mario", email: "mario@example.com", taxNumber: null, phone: null });
    expect(await getMember(prisma, created.id)).toEqual(updated);
  });

  it("replaces the guardians and keeps the unlinked guardian", async () => {
    const first = await createGuardian(prisma, "Iva", "Horvat");
    const created = await createMember(
      prisma,
      adult({ birthday: "2016-04-02", guardians: [{ kind: "existing", guardianId: first }] }),
      today,
    );
    const updated = await updateMember(
      prisma,
      created.id,
      { ...edit, birthday: "2016-04-02", guardians: [{ kind: "new", name: "Goran", surname: "Babić" }] },
      today,
    );
    expect(updated.guardians.map((guardian) => guardian.name)).toEqual(["Goran"]);
    expect(await prisma.guardian.count()).toBe(2);
  });

  it("keeps at least one guardian for a member under 18", async () => {
    const guardianId = await createGuardian(prisma);
    const created = await createMember(
      prisma,
      adult({ birthday: "2016-04-02", guardians: [{ kind: "existing", guardianId }] }),
      today,
    );
    await expect(updateMember(prisma, created.id, { ...edit, birthday: "2016-04-02" }, today)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("refuses an OIB or login email another member has", async () => {
    await createMember(prisma, adult({ taxNumber: "12345678901" }), today);
    const other = await createMember(prisma, adult({ name: "Ana" }), today);
    await expect(updateMember(prisma, other.id, { ...edit, taxNumber: "12345678901" }, today)).rejects.toMatchObject({
      code: "P2002",
    });

    await createLoginMember(prisma, orgId, "trainer", "trainer@example.com");
    const { memberId } = await createLoginMember(prisma, orgId, "admin", "admin@example.com");
    await expect(
      updateMember(prisma, String(memberId), { ...edit, email: "trainer@example.com" }, today),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("answers NOT_FOUND for an unknown member or guardian", async () => {
    await expect(updateMember(prisma, "999999", edit, today)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const created = await createMember(prisma, adult(), today);
    await expect(
      updateMember(prisma, created.id, { ...edit, guardians: [{ kind: "existing", guardianId: "999999" }] }, today),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("archiveMember", () => {
  const TODAY = "2026-11-16";

  const groupWithChild = async () => {
    const trainerId = String((await createLoginMember(prisma, orgId, "trainer")).memberId);
    const groupId = (
      await createGroup(prisma, { ownerId: trainerId, days: ["monday"], from: "18:00", to: "19:00" })
    ).id;
    const childId = String((await createLoginMember(prisma, orgId, "child")).memberId);
    await addGroupMember(prisma, groupId, childId, TODAY);
    return { trainerId, groupId, childId };
  };

  it("hides the member, takes them out of the group and keeps their attendance", async () => {
    const { groupId, childId } = await groupWithChild();
    const sessionId = (await addTrainingSession(prisma, groupId, "2026-11-09", TODAY)).id;
    await addTrainingSession(prisma, groupId, "2026-12-07", TODAY);
    await markAttendance(prisma, { groupId, sessionId, memberId: childId }, TODAY);

    await archiveMember(prisma, childId, today, TODAY);

    await expect(getMember(prisma, childId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listMembers(prisma, { page: 1, pageSize: 20 })).items.map((member) => member.id)).not.toContain(
      childId,
    );
    expect((await listGroupMembers(prisma, groupId)).items).toEqual([]);
    expect((await getGroupAttendance(prisma, groupId, "2026-11")).members).toMatchObject([
      { id: childId, attendedSessionIds: [sessionId] },
    ]);
    expect((await getGroupAttendance(prisma, groupId, "2026-12")).members).toEqual([]);
  });

  it("removes the login and every session", async () => {
    const { memberId } = await createLoginMember(prisma, orgId, "admin");
    await prisma.session.create({ data: { id: "hash", memberId, expiresAt: today } });

    await archiveMember(prisma, String(memberId), today, TODAY);

    expect(await prisma.login.count({ where: { memberId } })).toBe(0);
    expect(await prisma.session.count({ where: { memberId } })).toBe(0);
  });

  it("refuses the owner of an active group and changes nothing", async () => {
    const { trainerId, groupId } = await groupWithChild();
    await expect(archiveMember(prisma, trainerId, today, TODAY)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await getMember(prisma, trainerId)).id).toBe(trainerId);

    await archiveGroup(prisma, groupId, today);
    await archiveMember(prisma, trainerId, today, TODAY);
    await expect(getMember(prisma, trainerId)).rejects.toBeInstanceOf(AppError);
  });

  it("answers NOT_FOUND for an unknown or already archived member", async () => {
    const { childId } = await groupWithChild();
    await archiveMember(prisma, childId, today, TODAY);
    await expect(archiveMember(prisma, childId, today, TODAY)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(archiveMember(prisma, "abc", today, TODAY)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
