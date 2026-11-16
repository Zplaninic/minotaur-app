import { errorResponse, listMembersResponse, memberResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOrg, loggedInAs, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

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
