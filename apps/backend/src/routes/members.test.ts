import { errorResponse, listMembersResponse, memberResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOrg, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

let app: FastifyInstance;
let orgId: string;

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  orgId = await createOrg(app.db);
});

afterAll(async () => {
  await app.close();
});

const body = () => ({ orgId, name: "Marko", surname: "Babić", birthday: "1990-05-01" });

describe("POST /members", () => {
  it("creates a member", async () => {
    const response = await app.inject({ method: "POST", url: "/members", payload: body() });
    expect(response.statusCode).toBe(201);
    expect(memberResponse.parse(response.json())).toMatchObject({ name: "Marko", guardians: [] });
  });

  it("rejects an invalid body", async () => {
    const response = await app.inject({ method: "POST", url: "/members", payload: { ...body(), birthday: "1.5.1990" } });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("rejects a minor without guardians", async () => {
    const response = await app.inject({ method: "POST", url: "/members", payload: { ...body(), birthday: "2020-01-01" } });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers CONFLICT for a tax number that is already used", async () => {
    const payload = { ...body(), taxNumber: "01234567890" };
    await app.inject({ method: "POST", url: "/members", payload });
    const response = await app.inject({ method: "POST", url: "/members", payload });
    expect(response.statusCode).toBe(409);
    expect(errorResponse.parse(response.json()).code).toBe("CONFLICT");
  });

  it("answers NOT_FOUND for an id that is not a number", async () => {
    const response = await app.inject({ method: "POST", url: "/members", payload: { ...body(), orgId: "abc" } });
    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
  });
});

describe("GET /members", () => {
  it("lists members", async () => {
    await app.inject({ method: "POST", url: "/members", payload: body() });
    const response = await app.inject({ method: "GET", url: "/members?page=1&pageSize=10" });
    expect(response.statusCode).toBe(200);
    expect(listMembersResponse.parse(response.json())).toMatchObject({ total: 1, page: 1, pageSize: 10 });
  });

  it("rejects an invalid page size", async () => {
    const response = await app.inject({ method: "GET", url: "/members?pageSize=1000" });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });
});
