import { errorResponse, listGuardiansResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createGuardian, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
});

afterAll(async () => {
  await app.close();
});

describe("GET /guardians", () => {
  it("lists the guardians of active members, sorted by name", async () => {
    const orgId = await createOrg(app.db);
    const { memberId } = await createLoginMember(app.db, orgId, "admin");
    const headers = await authHeaders(app.db, memberId);
    const archived = await createLoginMember(app.db, orgId, "child");
    await app.db.member.update({ where: { id: archived.memberId }, data: { deletedAt: new Date() } });
    const link = (guardianId: string, toMemberId: number) =>
      app.db.memberGuardian.create({ data: { memberId: toMemberId, guardianId: Number(guardianId) } });
    await link(await createGuardian(app.db, orgId, "Iva", "Zorić"), memberId);
    await link(await createGuardian(app.db, orgId, "Ivan", "Babić"), memberId);
    await link(await createGuardian(app.db, orgId, "Petar", "Arhiviran"), archived.memberId);
    await createGuardian(app.db, orgId, "Nitko", "Nevezan");
    const response = await app.inject({ method: "GET", url: "/guardians", headers });
    expect(response.statusCode).toBe(200);
    expect(listGuardiansResponse.parse(response.json()).items.map((guardian) => guardian.name)).toEqual([
      "Iva",
      "Ivan",
    ]);
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/guardians" });
    expect(response.statusCode).toBe(401);
    expect(errorResponse.parse(response.json()).code).toBe("UNAUTHORIZED");
  });
});
