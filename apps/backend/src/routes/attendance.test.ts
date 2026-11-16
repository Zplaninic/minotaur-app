import { errorResponse, groupAttendanceResponse, trainingSessionResponse } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { config } from "../config.js";
import { buildServer } from "../server.js";
import { isoDateIn, monthOf, trainingDates } from "../services/attendance.js";
import { addGroupMember, createGroup } from "../services/groups.js";


// Routes use the real clock, so the dates follow the gym's current month.
const today = isoDateIn(new Date(), config.GYM_TIME_ZONE);
const thisMonth = monthOf(today);
const [year = 0, monthNumber = 1] = thisMonth.split("-").map(Number);
const lastMonth = monthNumber === 1 ? `${year - 1}-12` : `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
const nextMonth = monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
// Always today or earlier.
const firstOfThisMonth = `${thisMonth}-01`;

let app: FastifyInstance;
let trainer: { authorization: string };
let groupId: string;
let childId: string;

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  const orgId = await createOrg(app.db);
  const trainerMember = await createLoginMember(app.db, orgId, "trainer");
  trainer = await authHeaders(app.db, trainerMember.memberId);
  groupId = (
    await createGroup(app.db, {
      ownerId: String(trainerMember.memberId),
      days: ["monday", "wednesday"],
      from: "18:00",
      to: "19:00",
    })
  ).id;
  childId = String((await createLoginMember(app.db, orgId, "child")).memberId);
  await addGroupMember(app.db, groupId, childId, today);
});

afterAll(async () => {
  await app.close();
});

const getMonth = (month: string, headers: Record<string, string> = trainer) =>
  app.inject({ method: "GET", url: `/groups/${groupId}/attendance?month=${month}`, headers });

const addSession = (date: string) =>
  app.inject({ method: "POST", url: `/groups/${groupId}/sessions`, payload: { date }, headers: trainer });

describe("GET /groups/:id/attendance", () => {
  it("returns the month's sessions and members", async () => {
    await app.inject({
      method: "POST",
      url: `/groups/${groupId}/sessions/month`,
      payload: { month: thisMonth },
      headers: trainer,
    });
    const response = await getMonth(thisMonth);
    expect(response.statusCode).toBe(200);
    const body = groupAttendanceResponse.parse(response.json());
    expect(body.sessions).toHaveLength(trainingDates(thisMonth, ["monday", "wednesday"]).length);
    expect(body.members.map((member) => member.id)).toEqual([childId]);
  });

  it.each(["2026-13", "2026-08"])("rejects the month %s", async (month) => {
    const response = await getMonth(month);
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("answers UNAUTHORIZED when logged out", async () => {
    const response = await getMonth("2026-11", {});
    expect(response.statusCode).toBe(401);
  });
});

describe("POST /groups/:id/sessions/month", () => {
  it("rejects a missing month", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/groups/${groupId}/sessions/month`,
      payload: {},
      headers: trainer,
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("POST /groups/:id/sessions", () => {
  it("adds a session and answers CONFLICT for the same date again", async () => {
    const created = await addSession(`${thisMonth}-07`);
    expect(created.statusCode).toBe(201);
    expect(trainingSessionResponse.parse(created.json()).date).toBe(`${thisMonth}-07`);

    const again = await addSession(`${thisMonth}-07`);
    expect(again.statusCode).toBe(409);
    expect(errorResponse.parse(again.json()).code).toBe("CONFLICT");
  });

  it("rejects a date outside the current and next month", async () => {
    const response = await addSession(`${lastMonth}-15`);
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("rejects a date that is not an ISO date", async () => {
    const response = await addSession("7.11.2026");
    expect(response.statusCode).toBe(400);
  });
});

describe("DELETE /groups/:id/sessions/:sessionId", () => {
  it("deletes a session nobody attended", async () => {
    const sessionId = trainingSessionResponse.parse((await addSession(`${thisMonth}-07`)).json()).id;
    const response = await app.inject({
      method: "DELETE",
      url: `/groups/${groupId}/sessions/${sessionId}`,
      headers: trainer,
    });
    expect(response.statusCode).toBe(204);
  });
});

describe("PUT and DELETE /groups/:id/sessions/:sessionId/attendance/:memberId", () => {
  it("ticks and unticks a member", async () => {
    const sessionId = trainingSessionResponse.parse((await addSession(firstOfThisMonth)).json()).id;
    const url = `/groups/${groupId}/sessions/${sessionId}/attendance/${childId}`;

    expect((await app.inject({ method: "PUT", url, headers: trainer })).statusCode).toBe(204);
    expect(groupAttendanceResponse.parse((await getMonth(thisMonth)).json()).members[0]?.attendedSessionIds).toEqual([
      sessionId,
    ]);

    expect((await app.inject({ method: "DELETE", url, headers: trainer })).statusCode).toBe(204);
    expect(groupAttendanceResponse.parse((await getMonth(thisMonth)).json()).members[0]?.attendedSessionIds).toEqual(
      [],
    );
  });

  it("rejects a session far in the future", async () => {
    const sessionId = trainingSessionResponse.parse((await addSession(`${nextMonth}-15`)).json()).id;
    const response = await app.inject({
      method: "PUT",
      url: `/groups/${groupId}/sessions/${sessionId}/attendance/${childId}`,
      headers: trainer,
    });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });
});

describe("PUT and DELETE /groups/:id/months/:month/members/:memberId", () => {
  it("removes a member from a month and adds them back", async () => {
    await addSession(firstOfThisMonth);
    const url = `/groups/${groupId}/months/${thisMonth}/members/${childId}`;

    expect((await app.inject({ method: "DELETE", url, headers: trainer })).statusCode).toBe(204);
    expect(groupAttendanceResponse.parse((await getMonth(thisMonth)).json()).members).toEqual([]);

    expect((await app.inject({ method: "PUT", url, headers: trainer })).statusCode).toBe(204);
    expect(groupAttendanceResponse.parse((await getMonth(thisMonth)).json()).members).toHaveLength(1);
  });

  it("rejects a month that is not YYYY-MM", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/groups/${groupId}/months/${firstOfThisMonth}/members/${childId}`,
      headers: trainer,
    });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });
});
