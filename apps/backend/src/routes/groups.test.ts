import { errorResponse, groupResponse, listGroupsResponse, listMembersResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

let app: FastifyInstance;
let admin: { authorization: string };
let trainer: { authorization: string };
let trainerId: string;

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  const orgId = await createOrg(app.db);
  const adminMember = await createLoginMember(app.db, orgId, "admin");
  const trainerMember = await createLoginMember(app.db, orgId, "trainer");
  admin = await authHeaders(app.db, adminMember.memberId);
  trainer = await authHeaders(app.db, trainerMember.memberId);
  trainerId = String(trainerMember.memberId);
});

afterAll(async () => {
  await app.close();
});

const body = () => ({ ownerId: trainerId, days: ["tuesday", "thursday"], from: "17:00", to: "18:30" });

const post = (payload: object, headers = admin) => app.inject({ method: "POST", url: "/groups", payload, headers });

describe("POST /groups", () => {
  it("lets an admin create a group", async () => {
    const response = await post(body());
    expect(response.statusCode).toBe(201);
    expect(groupResponse.parse(response.json())).toMatchObject({
      owner: { id: trainerId },
      days: ["tuesday", "thursday"],
      from: "17:00",
      to: "18:30",
    });
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const response = await post(body(), trainer);
    expect(response.statusCode).toBe(403);
    expect(errorResponse.parse(response.json()).code).toBe("FORBIDDEN");
  });

  it.each([
    ["no days", { days: [] }],
    ["an end before the start", { from: "19:00", to: "18:00" }],
    ["a time that is not HH:mm", { from: "5pm" }],
  ])("rejects %s", async (_label, override) => {
    const response = await post({ ...body(), ...override });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("rejects an owner who is not a trainer", async () => {
    const me = await app.inject({ method: "GET", url: "/me", headers: admin });
    const response = await post({ ...body(), ownerId: me.json().memberId });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers NOT_FOUND for an unknown owner", async () => {
    const response = await post({ ...body(), ownerId: "999999" });
    expect(response.statusCode).toBe(404);
  });

  it("answers UNAUTHORIZED before looking at an invalid body", async () => {
    const response = await app.inject({ method: "POST", url: "/groups", payload: {} });
    expect(response.statusCode).toBe(401);
  });
});

describe("GET /groups", () => {
  it.each(["admin", "trainer"] as const)("lists every group for a %s", async (role) => {
    await post(body());
    const response = await app.inject({ method: "GET", url: "/groups", headers: role === "admin" ? admin : trainer });
    expect(response.statusCode).toBe(200);
    expect(listGroupsResponse.parse(response.json()).items).toHaveLength(1);
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/groups" });
    expect(response.statusCode).toBe(401);
  });
});

describe("GET /members?role=", () => {
  it("lists only members with that role", async () => {
    const response = await app.inject({ method: "GET", url: "/members?role=trainer", headers: admin });
    expect(response.statusCode).toBe(200);
    const list = listMembersResponse.parse(response.json());
    expect(list.total).toBe(1);
    expect(list.items.map((member) => member.id)).toEqual([trainerId]);
  });

  it("rejects an unknown role", async () => {
    const response = await app.inject({ method: "GET", url: "/members?role=boss", headers: admin });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });
});
