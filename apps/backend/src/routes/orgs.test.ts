import { listOrgsResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOrg, resetDb } from "../../test/db.js";
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

describe("GET /orgs", () => {
  it("lists orgs with id and name only", async () => {
    const id = await createOrg(app.db, "SPK Minotaur");
    const response = await app.inject({ method: "GET", url: "/orgs" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [{ id, name: "SPK Minotaur" }] });
    expect(listOrgsResponse.safeParse(response.json()).success).toBe(true);
  });
});
