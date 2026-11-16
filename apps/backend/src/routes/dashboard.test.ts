import { dashboardResponse, errorResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOrg, loggedInAs, resetDb } from "../../test/db.js";
import { config } from "../config.js";
import { buildServer } from "../server.js";
import { isoDateIn } from "../services/dates.js";

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

describe("GET /dashboard", () => {
  it.each(["admin", "trainer"] as const)("answers a %s with today at the gym", async (role) => {
    const headers = await loggedInAs(app.db, orgId, role);
    const response = await app.inject({ method: "GET", url: "/dashboard", headers });
    expect(response.statusCode).toBe(200);
    expect(dashboardResponse.parse(response.json())).toMatchObject({
      today: isoDateIn(new Date(), config.GYM_TIME_ZONE),
      activeMembers: 0,
      withoutSubscription: [],
    });
  });

  it("answers UNAUTHORIZED without a session, before anything else", async () => {
    const response = await app.inject({ method: "GET", url: "/dashboard?month=nope" });
    expect(response.statusCode).toBe(401);
    expect(errorResponse.parse(response.json()).code).toBe("UNAUTHORIZED");
  });
});
