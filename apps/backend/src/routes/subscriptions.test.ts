import {
  errorResponse,
  listSubscriptionsResponse,
  overduePaymentsResponse,
  subscriptionResponse,
  subscriptionSummaryResponse,
} from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

let app: FastifyInstance;
let admin: { authorization: string };
let trainer: { authorization: string };

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  const orgId = await createOrg(app.db);
  admin = await authHeaders(app.db, (await createLoginMember(app.db, orgId, "admin")).memberId);
  trainer = await authHeaders(app.db, (await createLoginMember(app.db, orgId, "trainer")).memberId);
});

afterAll(async () => {
  await app.close();
});

const body = { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 };

const post = (payload: object, headers: Record<string, string> = admin) =>
  app.inject({ method: "POST", url: "/subscriptions", payload, headers });

const put = (id: string, payload: object, headers: Record<string, string> = admin) =>
  app.inject({ method: "PUT", url: `/subscriptions/${id}`, payload, headers });

const errorCode = (response: { json: () => unknown }) => errorResponse.parse(response.json()).code;

describe("POST /subscriptions", () => {
  it("lets an admin create a subscription", async () => {
    const response = await post(body);
    expect(response.statusCode).toBe(201);
    expect(subscriptionResponse.parse(response.json())).toMatchObject(body);
  });

  it.each([
    ["no name", { name: "" }],
    ["0 sessions", { sessionsPerWeek: 0 }],
    ["8 sessions", { sessionsPerWeek: 8 }],
    ["a negative price", { price: -100 }],
    ["a price in euros with decimals", { price: 45.5 }],
  ])("rejects %s", async (_label, override) => {
    const response = await post({ ...body, ...override });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("answers CONFLICT for a name that is taken", async () => {
    await post(body);
    const response = await post({ ...body, sessionsPerWeek: 3 });
    expect(response.statusCode).toBe(409);
    expect(errorCode(response)).toBe("CONFLICT");
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const response = await post(body, trainer);
    expect(response.statusCode).toBe(403);
    expect(errorCode(response)).toBe("FORBIDDEN");
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await post(body, {});
    expect(response.statusCode).toBe(401);
    expect(errorCode(response)).toBe("UNAUTHORIZED");
  });
});

describe("GET /subscriptions", () => {
  it("lets a trainer read the list", async () => {
    await post(body);
    const response = await app.inject({ method: "GET", url: "/subscriptions", headers: trainer });
    expect(response.statusCode).toBe(200);
    expect(listSubscriptionsResponse.parse(response.json()).items).toMatchObject([body]);
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/subscriptions" });
    expect(response.statusCode).toBe(401);
  });
});

describe("PUT /subscriptions/:id", () => {
  const createdId = async () => subscriptionResponse.parse((await post(body)).json()).id;

  it("lets an admin edit a subscription", async () => {
    const id = await createdId();
    const response = await put(id, { name: "Kids 1x", sessionsPerWeek: 1, price: 3000 });
    expect(response.statusCode).toBe(200);
    expect(subscriptionResponse.parse(response.json())).toMatchObject({
      id,
      name: "Kids 1x",
      sessionsPerWeek: 1,
      price: 3000,
    });
  });

  it("keeps its own name", async () => {
    const id = await createdId();
    const response = await put(id, { ...body, price: 5000 });
    expect(response.statusCode).toBe(200);
  });

  it("rejects an invalid body", async () => {
    const id = await createdId();
    const response = await put(id, { ...body, sessionsPerWeek: 9 });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("answers CONFLICT for a name another subscription has", async () => {
    const id = await createdId();
    await post({ ...body, name: "Adults 3x" });
    const response = await put(id, { ...body, name: "Adults 3x" });
    expect(response.statusCode).toBe(409);
  });

  it.each(["999999", "abc"])("answers NOT_FOUND for id %s", async (id) => {
    const response = await put(id, body);
    expect(response.statusCode).toBe(404);
    expect(errorCode(response)).toBe("NOT_FOUND");
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const id = await createdId();
    const response = await put(id, body, trainer);
    expect(response.statusCode).toBe(403);
  });
});

describe("GET /subscriptions/summary", () => {
  it("lets a trainer read a month's totals", async () => {
    const response = await app.inject({ method: "GET", url: "/subscriptions/summary?month=2026-11", headers: trainer });
    expect(response.statusCode).toBe(200);
    expect(subscriptionSummaryResponse.parse(response.json())).toMatchObject({ month: "2026-11", members: 0 });
  });

  it.each(["", "?month=2026-8", "?month=2026-08"])("rejects %j", async (query) => {
    const response = await app.inject({ method: "GET", url: `/subscriptions/summary${query}`, headers: trainer });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/subscriptions/summary?month=2026-11" });
    expect(response.statusCode).toBe(401);
  });
});

describe("GET /subscriptions/overdue", () => {
  it("lets a trainer read the overdue list", async () => {
    const response = await app.inject({ method: "GET", url: "/subscriptions/overdue", headers: trainer });
    expect(response.statusCode).toBe(200);
    expect(overduePaymentsResponse.parse(response.json())).toEqual({ items: [], total: 0 });
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/subscriptions/overdue" });
    expect(response.statusCode).toBe(401);
  });
});
