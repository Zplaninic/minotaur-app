import { enrollmentRequestResponse, errorResponse, listEnrollmentRequestsResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

let app: FastifyInstance;
let admin: { authorization: string };
let trainer: { authorization: string };
let orgId: string;
let groupId: string;

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  orgId = await createOrg(app.db);
  const adminMember = await createLoginMember(app.db, orgId, "admin");
  const trainerMember = await createLoginMember(app.db, orgId, "trainer");
  admin = await authHeaders(app.db, adminMember.memberId);
  trainer = await authHeaders(app.db, trainerMember.memberId);
  const group = await app.db.group.create({
    data: {
      ownerId: trainerMember.memberId,
      days: ["monday"],
      from: new Date("1970-01-01T17:00:00.000Z"),
      to: new Date("1970-01-01T18:00:00.000Z"),
      ageFrom: 4,
      ageTo: 10,
    },
    select: { id: true },
  });
  groupId = String(group.id);
});

afterAll(async () => {
  await app.close();
});

// Fake data only.
const body = () => ({
  parentName: "Ivan",
  parentSurname: "Horvat",
  parentEmail: "parent@example.com",
  children: [
    { name: "Jan", age: 9 },
    { name: "Eva", age: 7.5 },
  ],
});

const create = async () => {
  const response = await app.inject({ method: "POST", url: "/enrollment-requests", payload: body(), headers: admin });
  return enrollmentRequestResponse.parse(response.json());
};

describe("POST /enrollment-requests", () => {
  it("creates a request with a recommended group per child", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/enrollment-requests",
      payload: body(),
      headers: admin,
    });
    expect(response.statusCode).toBe(201);
    expect(enrollmentRequestResponse.parse(response.json())).toMatchObject({
      parentName: "Ivan",
      children: [
        { name: "Jan", age: 9, groupId, status: "pending" },
        { name: "Eva", age: 7.5, groupId, status: "pending" },
      ],
    });
  });

  it.each([
    ["no children", { children: [] }],
    ["an age with two decimals", { children: [{ name: "Jan", age: 4.55 }] }],
    ["an invalid email", { parentEmail: "not an email" }],
    ["no parent name", { parentName: " " }],
  ])("answers VALIDATION_ERROR for %s", async (_, overrides) => {
    const response = await app.inject({
      method: "POST",
      url: "/enrollment-requests",
      payload: { ...body(), ...overrides },
      headers: admin,
    });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers UNAUTHORIZED without a login and FORBIDDEN for a trainer", async () => {
    const anonymous = await app.inject({ method: "POST", url: "/enrollment-requests", payload: body() });
    expect(anonymous.statusCode).toBe(401);
    const asTrainer = await app.inject({
      method: "POST",
      url: "/enrollment-requests",
      payload: body(),
      headers: trainer,
    });
    expect(asTrainer.statusCode).toBe(403);
  });
});

describe("GET /enrollment-requests", () => {
  it("lists open requests", async () => {
    const created = await create();
    const response = await app.inject({ method: "GET", url: "/enrollment-requests?state=open", headers: admin });
    expect(response.statusCode).toBe(200);
    expect(listEnrollmentRequestsResponse.parse(response.json())).toMatchObject({
      items: [{ id: created.id }],
      total: 1,
    });
  });

  it("answers VALIDATION_ERROR for an unknown state", async () => {
    const response = await app.inject({ method: "GET", url: "/enrollment-requests?state=lost", headers: admin });
    expect(response.statusCode).toBe(400);
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const response = await app.inject({ method: "GET", url: "/enrollment-requests", headers: trainer });
    expect(response.statusCode).toBe(403);
  });
});

describe("PUT /enrollment-requests/:id/children/:childId/group", () => {
  it("clears the group", async () => {
    const created = await create();
    const response = await app.inject({
      method: "PUT",
      url: `/enrollment-requests/${created.id}/children/${created.children[0]?.id ?? ""}/group`,
      payload: { groupId: null },
      headers: admin,
    });
    expect(response.statusCode).toBe(200);
    expect(enrollmentRequestResponse.parse(response.json()).children[0]?.groupId).toBeNull();
  });

  it("answers VALIDATION_ERROR without a groupId", async () => {
    const created = await create();
    const response = await app.inject({
      method: "PUT",
      url: `/enrollment-requests/${created.id}/children/${created.children[0]?.id ?? ""}/group`,
      payload: {},
      headers: admin,
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("POST /enrollment-requests/:id/children/:childId/accept", () => {
  it("accepts a child, then answers CONFLICT for a second accept", async () => {
    const created = await create();
    const url = `/enrollment-requests/${created.id}/children/${created.children[0]?.id ?? ""}/accept`;
    const payload = { orgId, surname: "Horvat", groupId };
    const response = await app.inject({ method: "POST", url, payload, headers: admin });
    expect(response.statusCode).toBe(200);
    expect(enrollmentRequestResponse.parse(response.json()).children[0]).toMatchObject({
      status: "accepted",
      memberId: expect.any(String),
    });

    const again = await app.inject({ method: "POST", url, payload, headers: admin });
    expect(again.statusCode).toBe(409);
    expect(errorResponse.parse(again.json()).code).toBe("CONFLICT");
  });

  it("answers VALIDATION_ERROR without a surname", async () => {
    const created = await create();
    const response = await app.inject({
      method: "POST",
      url: `/enrollment-requests/${created.id}/children/${created.children[0]?.id ?? ""}/accept`,
      payload: { orgId, surname: "", groupId },
      headers: admin,
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("POST /enrollment-requests/:id/children/:childId/reject", () => {
  it("rejects a child", async () => {
    const created = await create();
    const response = await app.inject({
      method: "POST",
      url: `/enrollment-requests/${created.id}/children/${created.children[1]?.id ?? ""}/reject`,
      headers: admin,
    });
    expect(response.statusCode).toBe(200);
    expect(enrollmentRequestResponse.parse(response.json()).children[1]?.status).toBe("rejected");
  });

  it("answers NOT_FOUND for an id that cannot exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/enrollment-requests/abc/children/1/reject",
      headers: admin,
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("POST /enrollment-requests/:id/children/:childId/reopen", () => {
  it("puts a rejected child back to waiting", async () => {
    const created = await create();
    const childUrl = `/enrollment-requests/${created.id}/children/${created.children[0]?.id ?? ""}`;
    await app.inject({ method: "POST", url: `${childUrl}/reject`, headers: admin });
    const response = await app.inject({ method: "POST", url: `${childUrl}/reopen`, headers: admin });
    expect(response.statusCode).toBe(200);
    expect(enrollmentRequestResponse.parse(response.json()).children[0]?.status).toBe("pending");
  });

  it("answers NOT_FOUND for an id that cannot exist, and FORBIDDEN for a trainer", async () => {
    const created = await create();
    expect(
      (await app.inject({ method: "POST", url: "/enrollment-requests/abc/children/1/reopen", headers: admin }))
        .statusCode,
    ).toBe(404);
    const childUrl = `/enrollment-requests/${created.id}/children/${created.children[0]?.id ?? ""}`;
    expect((await app.inject({ method: "POST", url: `${childUrl}/reopen`, headers: trainer })).statusCode).toBe(403);
  });
});

describe("DELETE /enrollment-requests/:id", () => {
  it("deletes a request", async () => {
    const created = await create();
    const response = await app.inject({ method: "DELETE", url: `/enrollment-requests/${created.id}`, headers: admin });
    expect(response.statusCode).toBe(204);
  });

  it("answers NOT_FOUND for a missing request", async () => {
    const response = await app.inject({ method: "DELETE", url: "/enrollment-requests/999999", headers: admin });
    expect(response.statusCode).toBe(404);
  });
});
