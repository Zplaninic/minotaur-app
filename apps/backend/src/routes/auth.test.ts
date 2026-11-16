import { errorResponse, loginResponse, meResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb, TEST_PASSWORD } from "../../test/db.js";
import { config } from "../config.js";
import { buildServer } from "../server.js";
import { setMemberRole } from "../services/logins.js";

// The login route allows 5 attempts per minute per IP, so each test builds
// its own server and stays under that unless it tests the limit.
let app: FastifyInstance;
let orgId: string;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await resetDb(app.db);
  orgId = await createOrg(app.db);
  await app.close();
  app = await buildServer();
});

afterAll(async () => {
  await app.close();
});

const login = (payload: object) => app.inject({ method: "POST", url: "/auth/login", payload });

const sessionCookie = (setCookie: string | string[] | undefined): string | undefined =>
  [setCookie ?? []].flat().find((cookie) => cookie.startsWith("session="));

describe("POST /auth/login", () => {
  it("logs an admin in with a cookie and returns them", async () => {
    await createLoginMember(app.db, orgId, "admin", "admin@example.com");
    const response = await login({ email: "Admin@Example.com", password: TEST_PASSWORD });
    expect(response.statusCode).toBe(200);
    expect(loginResponse.parse(response.json())).toEqual({
      me: expect.objectContaining({ email: "admin@example.com", role: "admin" }),
    });
    const cookie = sessionCookie(response.headers["set-cookie"]);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("returns a token for the mobile app", async () => {
    await createLoginMember(app.db, orgId, "trainer");
    const response = await login({ email: "trainer@example.com", password: TEST_PASSWORD, transport: "token" });
    expect(response.statusCode).toBe(200);
    const body = loginResponse.parse(response.json());
    expect(body.token).toEqual(expect.any(String));
    expect(sessionCookie(response.headers["set-cookie"])).toBeUndefined();

    const me = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${body.token}` } });
    expect(meResponse.parse(me.json()).role).toBe("trainer");
  });

  it.each([
    ["a wrong password", { email: "admin@example.com", password: "wrong password!" }],
    ["an unknown email", { email: "nobody@example.com", password: TEST_PASSWORD }],
  ])("answers the same UNAUTHORIZED for %s", async (_label, payload) => {
    await createLoginMember(app.db, orgId, "admin", "admin@example.com");
    const response = await login(payload);
    expect(response.statusCode).toBe(401);
    expect(errorResponse.parse(response.json())).toEqual({
      code: "UNAUTHORIZED",
      message: "Email or password is wrong",
    });
  });

  it.each(["child", "member"] as const)("refuses a %s even with the right password", async (role) => {
    await createLoginMember(app.db, orgId, role);
    const response = await login({ email: `${role}@example.com`, password: TEST_PASSWORD });
    expect(response.statusCode).toBe(401);
  });

  it("rejects an invalid body", async () => {
    const response = await login({ email: "not an email", password: "" });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers RATE_LIMITED after 5 attempts in a minute", async () => {
    const payload = { email: "nobody@example.com", password: "wrong password!" };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await login(payload)).statusCode).toBe(401);
    }
    const response = await login(payload);
    expect(response.statusCode).toBe(429);
    expect(errorResponse.parse(response.json()).code).toBe("RATE_LIMITED");
  });
});

describe("sessions", () => {
  it("accepts the session cookie and checks where data-changing requests come from", async () => {
    await createLoginMember(app.db, orgId, "admin", "admin@example.com");
    const loggedIn = await login({ email: "admin@example.com", password: TEST_PASSWORD });
    const cookie = sessionCookie(loggedIn.headers["set-cookie"])?.split(";")[0] ?? "";

    const me = await app.inject({ method: "GET", url: "/me", headers: { cookie } });
    expect(me.statusCode).toBe(200);

    const foreign = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { cookie, origin: "https://evil.example" },
    });
    expect(foreign.statusCode).toBe(403);

    const own = await app.inject({ method: "POST", url: "/auth/logout", headers: { cookie, origin: config.WEB_ORIGIN } });
    expect(own.statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: "/me", headers: { cookie } })).statusCode).toBe(401);
  });

  it("locks a trainer out on the next request when their role changes", async () => {
    const { memberId } = await createLoginMember(app.db, orgId, "trainer");
    const headers = await authHeaders(app.db, memberId);
    expect((await app.inject({ method: "GET", url: "/members", headers })).statusCode).toBe(200);

    await setMemberRole(app.db, memberId, "member", "2026-11-16");
    expect((await app.inject({ method: "GET", url: "/members", headers })).statusCode).toBe(401);
  });

  it("rejects an expired session", async () => {
    const { memberId } = await createLoginMember(app.db, orgId, "admin");
    const headers = await authHeaders(app.db, memberId);
    await app.db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await app.inject({ method: "GET", url: "/me", headers })).statusCode).toBe(401);
    expect(await app.db.session.count()).toBe(0);
  });
});

describe("GET /me", () => {
  it("answers UNAUTHORIZED without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/me" });
    expect(response.statusCode).toBe(401);
    expect(errorResponse.parse(response.json()).code).toBe("UNAUTHORIZED");
  });
});
