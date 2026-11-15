import { errorResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await app.close();
});

describe("server", () => {
  it("answers an unknown route with the shared error shape", async () => {
    const response = await app.inject({ method: "GET", url: "/nope" });
    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
  });

  it("is connected to the test database", async () => {
    const rows = await app.db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    expect(rows[0]?.name).toBe("minotaur_test");
  });
});
