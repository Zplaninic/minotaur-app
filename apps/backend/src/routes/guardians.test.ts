import { listGuardiansResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createGuardian, resetDb } from "../../test/db.js";
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
    await createGuardian(app.db, "Iva", "Zorić");
    await createGuardian(app.db, "Ivan", "Babić");
    const response = await app.inject({ method: "GET", url: "/guardians" });
    expect(response.statusCode).toBe(200);
    expect(listGuardiansResponse.parse(response.json()).items.map((guardian) => guardian.surname)).toEqual([
      "Babić",
      "Zorić",
    ]);
  });
});
