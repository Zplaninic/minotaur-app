import { errorResponse, listAuditEventsResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { buildServer } from "../server.js";

let app: FastifyInstance;
let adminId: number;
let admin: { authorization: string };
let trainer: { authorization: string };

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  const orgId = await createOrg(app.db);
  adminId = (await createLoginMember(app.db, orgId, "admin")).memberId;
  admin = await authHeaders(app.db, adminId);
  trainer = await authHeaders(app.db, (await createLoginMember(app.db, orgId, "trainer")).memberId);
});

afterAll(async () => {
  await app.close();
});

const get = (url: string, headers: Record<string, string> = admin) => app.inject({ method: "GET", url, headers });

const errorCode = (response: { json: () => unknown }) => errorResponse.parse(response.json()).code;

describe("GET /audit-events", () => {
  it("shows an admin who did what through the API", async () => {
    await app.inject({
      method: "POST",
      url: "/subscriptions",
      payload: { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 },
      headers: admin,
    });

    const response = await get("/audit-events?action=subscription_created");
    expect(response.statusCode).toBe(200);
    const { items, nextCursor } = listAuditEventsResponse.parse(response.json());
    expect(nextCursor).toBeNull();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      action: "subscription_created",
      actor: { id: String(adminId) },
      subscription: { name: "Kids 2x" },
      changes: { name: { from: null, to: "Kids 2x" }, price: { from: null, to: 4500 } },
    });
  });

  it.each(["limit=0", "limit=101", "action=nope", "from=yesterday"])("rejects %s", async (query) => {
    const response = await get(`/audit-events?${query}`);
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("is for admins only", async () => {
    const response = await get("/audit-events", trainer);
    expect(response.statusCode).toBe(403);
    expect(errorCode(response)).toBe("FORBIDDEN");
  });

  it("needs a login", async () => {
    const response = await get("/audit-events", {});
    expect(response.statusCode).toBe(401);
    expect(errorCode(response)).toBe("UNAUTHORIZED");
  });
});
