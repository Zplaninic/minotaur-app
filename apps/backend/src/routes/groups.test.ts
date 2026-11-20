import {
  errorResponse,
  groupResponse,
  listGroupMembersResponse,
  listGroupsResponse,
  listMembersResponse,
} from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

let app: FastifyInstance;
let admin: { authorization: string };
let trainer: { authorization: string };
let trainerId: string;
let childId: string;

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
  childId = String((await createLoginMember(app.db, orgId, "child")).memberId);
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
      ageFrom: null,
      ageTo: null,
      maxMembers: null,
    });
  });

  it("saves an age range", async () => {
    const response = await post({ ...body(), ageFrom: 7, ageTo: 10 });
    expect(response.statusCode).toBe(201);
    expect(groupResponse.parse(response.json())).toMatchObject({ ageFrom: 7, ageTo: 10 });
  });

  it("saves a member limit", async () => {
    const response = await post({ ...body(), maxMembers: 12 });
    expect(response.statusCode).toBe(201);
    expect(groupResponse.parse(response.json())).toMatchObject({ maxMembers: 12 });
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
    ["an upper age below the lower age", { ageFrom: 10, ageTo: 7 }],
    ["an age that is not a whole number", { ageFrom: "seven" }],
    ["a member limit of zero", { maxMembers: 0 }],
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

const createdGroupId = async (): Promise<string> => groupResponse.parse((await post(body())).json()).id;

const groupMember = (method: "PUT" | "DELETE", groupId: string, memberId: string, headers = admin) =>
  app.inject({ method, url: `/groups/${groupId}/members/${memberId}`, headers });

describe("GET /groups/:id", () => {
  it.each(["admin", "trainer"] as const)("returns the group for a %s", async (role) => {
    const groupId = await createdGroupId();
    const response = await app.inject({
      method: "GET",
      url: `/groups/${groupId}`,
      headers: role === "admin" ? admin : trainer,
    });
    expect(response.statusCode).toBe(200);
    expect(groupResponse.parse(response.json())).toMatchObject({ id: groupId, memberCount: 0 });
  });

  it("answers NOT_FOUND for an unknown group", async () => {
    const response = await app.inject({ method: "GET", url: "/groups/999999", headers: admin });
    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/groups/1" });
    expect(response.statusCode).toBe(401);
  });
});

const put = (groupId: string, payload: object, headers = admin) =>
  app.inject({ method: "PUT", url: `/groups/${groupId}`, payload, headers });

describe("PUT /groups/:id", () => {
  it("lets an admin replace the group", async () => {
    const groupId = await createdGroupId();
    const response = await put(groupId, { ...body(), days: ["friday"], from: "08:00", to: "09:00", ageFrom: 12 });
    expect(response.statusCode).toBe(200);
    expect(groupResponse.parse(response.json())).toMatchObject({
      id: groupId,
      days: ["friday"],
      from: "08:00",
      to: "09:00",
      ageFrom: 12,
      ageTo: null,
      maxMembers: null,
    });
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const groupId = await createdGroupId();
    const response = await put(groupId, body(), trainer);
    expect(response.statusCode).toBe(403);
    expect(errorResponse.parse(response.json()).code).toBe("FORBIDDEN");
  });

  it.each([
    ["no days", { days: [] }],
    ["an upper age below the lower age", { ageFrom: 10, ageTo: 7 }],
    ["a member limit past 999", { maxMembers: 1000 }],
  ])("rejects %s", async (_label, override) => {
    const groupId = await createdGroupId();
    const response = await put(groupId, { ...body(), ...override });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers NOT_FOUND for an unknown group", async () => {
    const response = await put("999999", body());
    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
  });

  it("answers UNAUTHORIZED before looking at an invalid body", async () => {
    const response = await app.inject({ method: "PUT", url: "/groups/1", payload: {} });
    expect(response.statusCode).toBe(401);
  });
});

describe("DELETE /groups/:id", () => {
  it("lets an admin archive a group, which then leaves the list", async () => {
    const groupId = await createdGroupId();
    expect((await app.inject({ method: "DELETE", url: `/groups/${groupId}`, headers: admin })).statusCode).toBe(204);

    expect((await app.inject({ method: "GET", url: `/groups/${groupId}`, headers: admin })).statusCode).toBe(404);
    const list = await app.inject({ method: "GET", url: "/groups", headers: admin });
    expect(listGroupsResponse.parse(list.json()).items).toEqual([]);
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const groupId = await createdGroupId();
    const response = await app.inject({ method: "DELETE", url: `/groups/${groupId}`, headers: trainer });
    expect(response.statusCode).toBe(403);
    expect(errorResponse.parse(response.json()).code).toBe("FORBIDDEN");
  });

  it("answers NOT_FOUND for an unknown or already archived group", async () => {
    const groupId = await createdGroupId();
    await app.inject({ method: "DELETE", url: `/groups/${groupId}`, headers: admin });
    expect((await app.inject({ method: "DELETE", url: `/groups/${groupId}`, headers: admin })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: "/groups/abc", headers: admin })).statusCode).toBe(404);
  });

  it("answers UNAUTHORIZED without a session", async () => {
    expect((await app.inject({ method: "DELETE", url: "/groups/1" })).statusCode).toBe(401);
  });

  it("refuses to archive the owner of an active group", async () => {
    await createdGroupId();
    const response = await app.inject({ method: "DELETE", url: `/members/${trainerId}`, headers: admin });
    expect(response.statusCode).toBe(409);
    expect(errorResponse.parse(response.json()).code).toBe("CONFLICT");
  });
});

describe("PUT /groups/:id/members/:memberId", () => {
  it("lets an admin add a member, and add them again", async () => {
    const groupId = await createdGroupId();
    expect((await groupMember("PUT", groupId, childId)).statusCode).toBe(204);
    expect((await groupMember("PUT", groupId, childId)).statusCode).toBe(204);

    const list = await app.inject({ method: "GET", url: `/groups/${groupId}/members`, headers: trainer });
    expect(list.statusCode).toBe(200);
    expect(listGroupMembersResponse.parse(list.json()).items).toMatchObject([
      { id: childId, name: "Test", surname: "child", birthday: "1990-01-01", guardians: [] },
    ]);
  });

  it("rejects a member who is a trainer", async () => {
    const response = await groupMember("PUT", await createdGroupId(), trainerId);
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const response = await groupMember("PUT", await createdGroupId(), childId, trainer);
    expect(response.statusCode).toBe(403);
    expect(errorResponse.parse(response.json()).code).toBe("FORBIDDEN");
  });

  it("answers NOT_FOUND for an unknown group or member", async () => {
    expect((await groupMember("PUT", "999999", childId)).statusCode).toBe(404);
    expect((await groupMember("PUT", await createdGroupId(), "999999")).statusCode).toBe(404);
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "PUT", url: "/groups/1/members/1" });
    expect(response.statusCode).toBe(401);
  });
});

describe("DELETE /groups/:id/members/:memberId", () => {
  it("lets an admin remove a member", async () => {
    const groupId = await createdGroupId();
    await groupMember("PUT", groupId, childId);
    expect((await groupMember("DELETE", groupId, childId)).statusCode).toBe(204);

    const list = await app.inject({ method: "GET", url: `/groups/${groupId}/members`, headers: admin });
    expect(listGroupMembersResponse.parse(list.json()).items).toEqual([]);
  });

  it("answers FORBIDDEN for a trainer", async () => {
    const groupId = await createdGroupId();
    await groupMember("PUT", groupId, childId);
    const response = await groupMember("DELETE", groupId, childId, trainer);
    expect(response.statusCode).toBe(403);
    expect(errorResponse.parse(response.json()).code).toBe("FORBIDDEN");
  });

  it("answers NOT_FOUND for an unknown group", async () => {
    const response = await groupMember("DELETE", "999999", childId);
    expect(response.statusCode).toBe(404);
    expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
  });
});

describe("GET /groups/:id/members", () => {
  it("answers NOT_FOUND for an unknown group", async () => {
    const response = await app.inject({ method: "GET", url: "/groups/999999/members", headers: admin });
    expect(response.statusCode).toBe(404);
  });

  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/groups/1/members" });
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
