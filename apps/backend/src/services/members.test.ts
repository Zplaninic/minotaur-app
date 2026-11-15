import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createGuardian, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import { AppError } from "../errors.js";
import { ageOn, createMember, listMembers } from "./members.js";

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
