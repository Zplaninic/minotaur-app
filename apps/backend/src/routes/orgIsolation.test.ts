import {
  dashboardResponse,
  errorResponse,
  listAuditEventsResponse,
  listEnrollmentRequestsResponse,
  listGroupsResponse,
  listGuardiansResponse,
  listMembersResponse,
  listSubscriptionsResponse,
  meResponse,
  memberResponse,
  overduePaymentsResponse,
  subscriptionSummaryResponse,
} from "@repo/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authHeaders, createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { config } from "../config.js";
import { buildServer } from "../server.js";
import { createMonthSessions, getGroupAttendance, setMonthSubscription } from "../services/attendance.js";
import { systemActor, type Actor } from "../services/audit.js";
import { isoDateIn, monthOf } from "../services/dates.js";
import { createEnrollmentRequest } from "../services/enrollmentRequests.js";
import { addGroupMember, createGroup } from "../services/groups.js";
import { createMember } from "../services/members.js";
import { createSubscription } from "../services/subscriptions.js";

// Two clubs in one database. Everything is asked as our admin; "their"
// records belong to the other club and must stay out of reach.
const today = isoDateIn(new Date(), config.GYM_TIME_ZONE);
const month = monthOf(today);
// The day before the first of this month.
const lastMonth = monthOf(new Date(Date.parse(`${month}-01T00:00:00.000Z`) - 86_400_000).toISOString().slice(0, 10));
const kids = { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 };

type Club = {
  actor: Actor;
  trainerId: string;
  childId: string;
  guardianId: string;
  groupId: string;
  sessionId: string;
  subscriptionId: string;
  requestId: string;
  requestChildId: string;
};

let app: FastifyInstance;
let admin: { authorization: string };
let ours: Club;
let theirs: Club;

const createClub = async (name: string, prefix: string): Promise<{ orgId: string; club: Club }> => {
  const orgId = await createOrg(app.db, name);
  const actor = systemActor(Number(orgId));
  const trainerId = String((await createLoginMember(app.db, orgId, "trainer", `${prefix}-trainer@example.com`)).memberId);
  const child = await createMember(
    app.db,
    actor,
    { name: prefix, surname: "Child", birthday: "2015-03-01", guardians: [{ kind: "new", name: prefix, surname: "Parent" }] },
    today,
  );
  const group = await createGroup(app.db, actor, {
    ownerId: trainerId,
    days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    from: "17:00",
    to: "18:00",
    ageFrom: null,
    ageTo: null,
    maxMembers: null,
  });
  await addGroupMember(app.db, actor, group.id, child.id, today);
  await createMonthSessions(app.db, actor, group.id, month, today);
  const { sessions } = await getGroupAttendance(app.db, actor.orgId, group.id, month);
  const subscription = await createSubscription(app.db, actor, kids);
  await setMonthSubscription(app.db, actor, { groupId: group.id, month, memberId: child.id }, subscription.id);
  const request = await createEnrollmentRequest(app.db, actor, {
    parentName: prefix,
    parentEmail: `${prefix}-parent@example.com`,
    children: [{ name: "Tin", age: 8 }],
  });
  return {
    orgId,
    club: {
      actor,
      trainerId,
      childId: child.id,
      guardianId: child.guardians[0]?.id ?? "",
      groupId: group.id,
      sessionId: sessions[0]?.id ?? "",
      subscriptionId: subscription.id,
      requestId: request.id,
      requestChildId: request.children[0]?.id ?? "",
    },
  };
};

beforeAll(async () => {
  app = await buildServer();
});

beforeEach(async () => {
  await resetDb(app.db);
  const our = await createClub("Ours", "our");
  ours = our.club;
  theirs = (await createClub("Theirs", "their")).club;
  admin = await authHeaders(app.db, (await createLoginMember(app.db, our.orgId, "admin")).memberId);
  await createLoginMember(app.db, String(theirs.actor.orgId), "admin", "their-admin@example.com");
});

afterAll(async () => {
  await app.close();
});

const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
  app.inject({ method, url, headers: admin, ...(payload ? { payload } : {}) });

const expectNotFound = async (response: Awaited<ReturnType<typeof call>>) => {
  expect(response.statusCode).toBe(404);
  expect(errorResponse.parse(response.json()).code).toBe("NOT_FOUND");
};

const groupBody = (ownerId: string) => ({ ownerId, days: ["monday"], from: "17:00", to: "18:00" });

describe("the logged-in member's org", () => {
  it("is part of /me", async () => {
    const me = meResponse.parse((await call("GET", "/me")).json());
    expect(me.org).toEqual({ id: String(ours.actor.orgId), name: "Ours" });
  });

  it("is the org of a member created through the API", async () => {
    const response = await call("POST", "/members", { name: "Nova", surname: "Novak" });
    expect(response.statusCode).toBe(201);
    expect(memberResponse.parse(response.json()).orgId).toBe(String(ours.actor.orgId));
  });
});

describe("lists hold only the org's own records", () => {
  it("members", async () => {
    const { items } = listMembersResponse.parse((await call("GET", "/members?pageSize=100")).json());
    expect(items.map((member) => member.id)).toContain(ours.childId);
    expect(items.every((member) => member.orgId === String(ours.actor.orgId))).toBe(true);
  });

  it("guardians", async () => {
    const { items } = listGuardiansResponse.parse((await call("GET", "/guardians")).json());
    expect(items.map((guardian) => guardian.id)).toEqual([ours.guardianId]);
  });

  it("groups", async () => {
    const { items } = listGroupsResponse.parse((await call("GET", "/groups")).json());
    expect(items.map((group) => group.id)).toEqual([ours.groupId]);
  });

  it("subscriptions, which may share a name with another org's", async () => {
    const { items } = listSubscriptionsResponse.parse((await call("GET", "/subscriptions")).json());
    expect(items.map((subscription) => subscription.id)).toEqual([ours.subscriptionId]);
  });

  it("the month's money", async () => {
    const summary = subscriptionSummaryResponse.parse((await call("GET", `/subscriptions/summary?month=${month}`)).json());
    expect(summary).toMatchObject({ members: 1, expected: kids.price });
  });

  it("overdue payments", async () => {
    for (const club of [ours, theirs]) {
      await app.db.memberMonth.create({
        data: {
          memberId: Number(club.childId),
          month: new Date(`${lastMonth}-01T00:00:00.000Z`),
          subscriptionId: Number(club.subscriptionId),
          subscriptionPrice: kids.price,
          subscriptionSessionsPerWeek: kids.sessionsPerWeek,
        },
      });
    }
    const { items } = overduePaymentsResponse.parse((await call("GET", "/subscriptions/overdue")).json());
    expect(items.map((item) => item.id)).toEqual([ours.childId]);
  });

  it("the dashboard", async () => {
    const dashboard = dashboardResponse.parse((await call("GET", "/dashboard")).json());
    expect(dashboard.activeMembers).toBe(1);
  });

  it("enrollment requests and the children waiting for a group", async () => {
    const list = listEnrollmentRequestsResponse.parse((await call("GET", "/enrollment-requests")).json());
    expect(list.items.map((request) => request.id)).toEqual([ours.requestId]);
    expect(Object.keys(list.waitingByGroup)).toEqual([ours.groupId]);
  });

  it("the activity log", async () => {
    const { items } = listAuditEventsResponse.parse((await call("GET", "/audit-events?limit=100")).json());
    expect(items.length).toBeGreaterThan(0);
    expect(await app.db.auditEvent.count({ where: { orgId: ours.actor.orgId } })).toBe(items.length);
    const log = listAuditEventsResponse.parse((await call("GET", `/audit-events?memberId=${theirs.childId}`)).json());
    expect(log.items).toEqual([]);
  });
});

describe("another org's records answer NOT_FOUND", () => {
  it("a member", async () => {
    const url = `/members/${theirs.childId}`;
    await expectNotFound(await call("GET", url));
    await expectNotFound(await call("PUT", url, { name: "Taken", surname: "Over" }));
    await expectNotFound(await call("PUT", `${url}/new`, { isNew: true }));
    await expectNotFound(await call("DELETE", url));
    expect(await app.db.member.findUnique({ where: { id: Number(theirs.childId) } })).toMatchObject({
      name: "their",
      deletedAt: null,
      isNew: false,
    });
  });

  it("a group and its members", async () => {
    const url = `/groups/${theirs.groupId}`;
    await expectNotFound(await call("GET", url));
    await expectNotFound(await call("PUT", url, groupBody(ours.trainerId)));
    await expectNotFound(await call("DELETE", url));
    await expectNotFound(await call("GET", `${url}/members`));
    await expectNotFound(await call("PUT", `${url}/members/${ours.childId}`));
    await expectNotFound(await call("DELETE", `${url}/members/${theirs.childId}`));
    expect(await app.db.groupMember.count({ where: { groupId: Number(theirs.groupId) } })).toBe(1);
  });

  it("a group's attendance, sessions and months", async () => {
    const url = `/groups/${theirs.groupId}`;
    const monthMember = `${url}/months/${month}/members/${theirs.childId}`;
    await expectNotFound(await call("GET", `${url}/attendance?month=${month}`));
    await expectNotFound(await call("POST", `${url}/sessions/month`, { month }));
    await expectNotFound(await call("POST", `${url}/sessions`, { date: today }));
    await expectNotFound(await call("DELETE", `${url}/sessions/${theirs.sessionId}`));
    await expectNotFound(await call("PUT", `${url}/sessions/${theirs.sessionId}/attendance/${theirs.childId}`));
    await expectNotFound(await call("DELETE", `${url}/sessions/${theirs.sessionId}/attendance/${theirs.childId}`));
    await expectNotFound(await call("PUT", monthMember, { joinGroup: false }));
    await expectNotFound(await call("DELETE", monthMember));
    await expectNotFound(await call("PUT", `${monthMember}/subscription`, { subscriptionId: null }));
    await expectNotFound(await call("PUT", `${monthMember}/paid`, { paid: true }));
    await expectNotFound(await call("PUT", `${monthMember}/comment`, { comment: "seen" }));
    expect(await app.db.memberMonth.findFirst({ where: { memberId: Number(theirs.childId) } })).toMatchObject({
      subscriptionId: Number(theirs.subscriptionId),
      paid: false,
      comment: null,
    });
  });

  it("a subscription", async () => {
    await expectNotFound(await call("PUT", `/subscriptions/${theirs.subscriptionId}`, { ...kids, price: 1 }));
    expect((await app.db.subscription.findUnique({ where: { id: Number(theirs.subscriptionId) } }))?.price).toBe(kids.price);
  });

  it("an enrollment request", async () => {
    const child = `/enrollment-requests/${theirs.requestId}/children/${theirs.requestChildId}`;
    await expectNotFound(await call("PUT", `${child}/group`, { groupId: null }));
    await expectNotFound(await call("POST", `${child}/accept`, { surname: "Novak", groupId: ours.groupId }));
    await expectNotFound(await call("POST", `${child}/reject`));
    await expectNotFound(await call("POST", `${child}/reopen`));
    await expectNotFound(await call("DELETE", `/enrollment-requests/${theirs.requestId}`));
    expect(await app.db.enrollmentChild.findUnique({ where: { id: Number(theirs.requestChildId) } })).toMatchObject({
      status: "pending",
      groupId: Number(theirs.groupId),
    });
  });
});

describe("our records cannot be tied to another org's", () => {
  it("a new member to their guardian", async () => {
    const body = { name: "Nova", surname: "Novak", guardians: [{ kind: "existing", guardianId: theirs.guardianId }] };
    await expectNotFound(await call("POST", "/members", body));
    await expectNotFound(await call("PUT", `/members/${ours.childId}`, body));
  });

  it("a group to their trainer", async () => {
    await expectNotFound(await call("POST", "/groups", groupBody(theirs.trainerId)));
    await expectNotFound(await call("PUT", `/groups/${ours.groupId}`, groupBody(theirs.trainerId)));
  });

  it("our group to their member", async () => {
    await expectNotFound(await call("PUT", `/groups/${ours.groupId}/members/${theirs.childId}`));
    await expectNotFound(
      await call("PUT", `/groups/${ours.groupId}/months/${month}/members/${theirs.childId}`, { joinGroup: true }),
    );
  });

  it("our member's month to their subscription", async () => {
    const url = `/groups/${ours.groupId}/months/${month}/members/${ours.childId}/subscription`;
    await expectNotFound(await call("PUT", url, { subscriptionId: theirs.subscriptionId }));
  });

  it("our enrollment request to their group", async () => {
    const child = `/enrollment-requests/${ours.requestId}/children/${ours.requestChildId}`;
    await expectNotFound(await call("PUT", `${child}/group`, { groupId: theirs.groupId }));
    await expectNotFound(await call("POST", `${child}/accept`, { surname: "Novak", groupId: theirs.groupId }));
  });
});

describe("values unique within an org", () => {
  it("lets two orgs use the same tax number", async () => {
    const taxNumber = "12345678901";
    await app.db.member.update({ where: { id: Number(theirs.childId) }, data: { taxNumber } });
    const response = await call("POST", "/members", { name: "Nova", surname: "Novak", taxNumber });
    expect(response.statusCode).toBe(201);
    expect((await call("POST", "/members", { name: "Druga", surname: "Novak", taxNumber })).statusCode).toBe(409);
  });
});
