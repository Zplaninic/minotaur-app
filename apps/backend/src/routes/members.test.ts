import { errorResponse, listMembersResponse, memberResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOrg, loggedInAs, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";
import { createSubscription } from "../services/subscriptions.js";

let app: FastifyInstance;
let orgId: string;
let headers: { authorization: string };

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  orgId = await createOrg(app.db);
  headers = await loggedInAs(app.db, orgId, "admin");
});

afterAll(async () => {
  await app.close();
});

const body = () => ({ orgId, name: "Marko", surname: "Babić", birthday: "1990-05-01" });

const post = (payload: object, as = headers) => app.inject({ method: "POST", url: "/members", payload, headers: as });

describe("POST /members", () => {
  it("creates a member with the default role child", async () => {
    const response = await post(body());
    expect(response.statusCode).toBe(201);
    expect(memberResponse.parse(response.json())).toMatchObject({ name: "Marko", role: "child", guardians: [] });
  });

  it("ignores a role sent in the body", async () => {
    const response = await post({ ...body(), role: "admin" });
    expect(response.statusCode).toBe(201);
    expect(memberResponse.parse(response.json()).role).toBe("child");
  });

  it("works for a trainer too", async () => {
    const trainer = await loggedInAs(app.db, orgId, "trainer");
    expect((await post(body(), trainer)).statusCode).toBe(201);
  });

  it("answers VALIDATION_ERROR for a body that is not JSON", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/members",
      payload: "{bad",
      headers: { ...headers, "content-type": "application/json" },
    });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("rejects a birthday before 1900", async () => {
    expect((await post({ ...body(), birthday: "0000-01-01" })).statusCode).toBe(400);
  });

  it("rejects an invalid body", async () => {
    const response = await post({ ...body(), birthday: "1.5.1990" });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("rejects a minor without guardians", async () => {
    const response = await post({ ...body(), birthday: "2020-01-01" });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers CONFLICT for a tax number that is already used", async () => {
    const payload = { ...body(), taxNumber: "01234567890" };
    await post(payload);
    const response = await post(payload);
    expect(response.statusCode).toBe(409);
    expect(errorResponse.parse(response.json()).code).toBe("CONFLICT");
  });

  it("answers NOT_FOUND for an id that is not a number", async () => {
    const response = await post({ ...body(), orgId: "abc" });
    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "POST", url: "/members", payload: body() });
    expect(response.statusCode).toBe(401);
    expect(errorResponse.parse(response.json()).code).toBe("UNAUTHORIZED");
  });
});

describe("GET /members", () => {
  it("lists members, including the logged-in admin", async () => {
    await post(body());
    const response = await app.inject({ method: "GET", url: "/members?page=1&pageSize=10", headers });
    expect(response.statusCode).toBe(200);
    expect(listMembersResponse.parse(response.json())).toMatchObject({ total: 2, page: 1, pageSize: 10 });
  });

  it("rejects an invalid page size", async () => {
    const response = await app.inject({ method: "GET", url: "/members?pageSize=1000", headers });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/members" });
    expect(response.statusCode).toBe(401);
  });
});

describe("logged out", () => {
  it("answers UNAUTHORIZED before looking at an invalid body", async () => {
    const response = await app.inject({ method: "POST", url: "/members", payload: {} });
    expect(response.statusCode).toBe(401);
  });
});

describe("PUT /members/:id and GET /members/:id", () => {
  it("edits a member and returns it", async () => {
    const created = memberResponse.parse((await post(body())).json());
    const response = await app.inject({
      method: "PUT",
      url: `/members/${created.id}`,
      payload: { name: "Mario", surname: "Babić", birthday: "1990-05-01", phone: "+385 91 111 2222" },
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(memberResponse.parse(response.json())).toMatchObject({ name: "Mario", phone: "+385 91 111 2222" });

    const fetched = await app.inject({ method: "GET", url: `/members/${created.id}`, headers });
    expect(memberResponse.parse(fetched.json()).name).toBe("Mario");
  });

  it("rejects an invalid edit", async () => {
    const created = memberResponse.parse((await post(body())).json());
    const response = await app.inject({
      method: "PUT",
      url: `/members/${created.id}`,
      payload: { name: "", surname: "Babić", birthday: "1990-05-01" },
      headers,
    });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers NOT_FOUND for an unknown member", async () => {
    const response = await app.inject({ method: "GET", url: "/members/999999", headers });
    expect(response.statusCode).toBe(404);
  });
});

describe("DELETE /members/:id", () => {
  const archive = (memberId: string) => app.inject({ method: "DELETE", url: `/members/${memberId}`, headers });

  it("archives a member, who then answers NOT_FOUND", async () => {
    const created = memberResponse.parse((await post(body())).json());
    expect((await archive(created.id)).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: `/members/${created.id}`, headers })).statusCode).toBe(404);
  });

  it("answers FORBIDDEN to someone deleting themselves", async () => {
    const me = await app.inject({ method: "GET", url: "/me", headers });
    const response = await archive(me.json().memberId);
    expect(response.statusCode).toBe(403);
    expect(errorResponse.parse(response.json()).code).toBe("FORBIDDEN");
  });

  it("answers NOT_FOUND for an id that is not a number", async () => {
    const response = await archive("abc");
    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
  });

  it("answers UNAUTHORIZED without a session", async () => {
    expect((await app.inject({ method: "DELETE", url: "/members/1" })).statusCode).toBe(401);
  });
});

describe("GET /members?unpaid=true", () => {
  // September 2026 is the first month, so it is always in the past.
  const september = new Date("2026-09-01T00:00:00.000Z");

  it("lists only members with an unpaid past month", async () => {
    const created = async (name: string) => memberResponse.parse((await post({ ...body(), name })).json()).id;
    const ana = await created("Ana");
    const ivo = await created("Ivo");
    await created("Luka");
    const subscription = await createSubscription(app.db, { name: "Adults 2x", sessionsPerWeek: 2, price: 5000 });
    const month = (memberId: string, paid: boolean) => ({
      memberId: Number(memberId),
      month: september,
      subscriptionId: Number(subscription.id),
      subscriptionPrice: 5000,
      subscriptionSessionsPerWeek: 2,
      paid,
    });
    await app.db.memberMonth.createMany({ data: [month(ana, false), month(ivo, true)] });

    const response = await app.inject({ method: "GET", url: "/members?unpaid=true", headers });
    expect(response.statusCode).toBe(200);
    expect(listMembersResponse.parse(response.json()).items.map((member) => member.id)).toEqual([ana]);

    const all = await app.inject({ method: "GET", url: "/members", headers });
    expect(listMembersResponse.parse(all.json()).total).toBeGreaterThanOrEqual(3);
  });

  it("rejects a filter value that is not true or false", async () => {
    const response = await app.inject({ method: "GET", url: "/members?unpaid=maybe", headers });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });
});
