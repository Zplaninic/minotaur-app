import { errorResponse, listGuardiansResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createGuardian, createOrg, loggedInAs, resetDb } from "../../test/db.js";
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
  it("lists guardians sorted by surname", async () => {
    const headers = await loggedInAs(app.db, await createOrg(app.db), "admin");
    await createGuardian(app.db, "Iva", "Zorić");
    await createGuardian(app.db, "Ivan", "Babić");
    const response = await app.inject({ method: "GET", url: "/guardians", headers });
    expect(response.statusCode).toBe(200);
    expect(listGuardiansResponse.parse(response.json()).items.map((guardian) => guardian.surname)).toEqual([
      "Babić",
      "Zorić",
    ]);
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/guardians" });
    expect(response.statusCode).toBe(401);
    expect(errorResponse.parse(response.json()).code).toBe("UNAUTHORIZED");
  });
});
