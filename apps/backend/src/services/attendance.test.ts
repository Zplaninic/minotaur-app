import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import {
  addMonthMember,
  addTrainingSession,
  createMonthSessions,
  deleteTrainingSession,
  getGroupAttendance,
  markAttendance,
  removeMonthMember,
  setMonthComment,
  setMonthPaid,
  setMonthSubscription,
  unmarkAttendance,
} from "./attendance.js";
import { trainingDates } from "./dates.js";
import { addGroupMember, archiveGroup, createGroup, removeGroupMember } from "./groups.js";
import { createSubscription, updateSubscription } from "./subscriptions.js";

let orgId: string;
let groupId: string;
let childId: string;

const TODAY = "2026-11-16";

beforeEach(async () => {
  await resetDb(prisma);
  orgId = await createOrg(prisma);
  const trainerId = String((await createLoginMember(prisma, orgId, "trainer")).memberId);
  groupId = (await createGroup(prisma, { ownerId: trainerId, days: ["monday", "wednesday"], from: "18:00", to: "19:00" }))
    .id;
  childId = String((await createLoginMember(prisma, orgId, "child")).memberId);
  await addGroupMember(prisma, groupId, childId, TODAY);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const sessionOn = async (date: string, today = TODAY): Promise<string> =>
  (await addTrainingSession(prisma, groupId, date, today)).id;

describe("createMonthSessions", () => {
  it("creates a session for every training day of the month, once", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    const { sessions } = await getGroupAttendance(prisma, groupId, "2026-11");
    expect(sessions.map((session) => session.date)).toEqual(trainingDates("2026-11", ["monday", "wednesday"]));
  });

  it("keeps an extra session already in the month", async () => {
    await sessionOn("2026-11-07");
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    const { sessions } = await getGroupAttendance(prisma, groupId, "2026-11");
    expect(sessions).toHaveLength(10);
    expect(sessions[2]?.date).toBe("2026-11-07");
  });

  it("rejects an unknown group", async () => {
    await expect(createMonthSessions(prisma, "999999", "2026-11", TODAY)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("creating sessions", () => {
  it("is allowed for the current and the next month only", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await createMonthSessions(prisma, groupId, "2026-12", TODAY);
    await sessionOn("2026-12-31");

    for (const month of ["2026-10", "2027-01"]) {
      await expect(createMonthSessions(prisma, groupId, month, TODAY)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    }
    await expect(sessionOn("2026-10-31")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(sessionOn("2027-01-01")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("allows January when today is in December", async () => {
    await expect(sessionOn("2027-01-04", "2026-12-20")).resolves.toBeDefined();
  });
});

describe("getGroupAttendance", () => {
  it("returns only the month's sessions and who attended them", async () => {
    const october = await sessionOn("2026-10-28", "2026-10-01");
    const first = await sessionOn("2026-11-02");
    const second = await sessionOn("2026-11-04");
    await markAttendance(prisma, { groupId, sessionId: october, memberId: childId }, TODAY);
    await markAttendance(prisma, { groupId, sessionId: second, memberId: childId }, TODAY);

    const attendance = await getGroupAttendance(prisma, groupId, "2026-11");
    expect(attendance.sessions).toEqual([
      { id: first, date: "2026-11-02" },
      { id: second, date: "2026-11-04" },
    ]);
    expect(attendance.members).toEqual([
      {
        id: childId,
        name: "Test",
        surname: "child",
        attendedSessionIds: [second],
        subscription: null,
        paid: false,
        comment: null,
      },
    ]);
  });
});

describe("addTrainingSession", () => {
  it("rejects a second session on the same date", async () => {
    await sessionOn("2026-11-07");
    await expect(sessionOn("2026-11-07")).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("deleteTrainingSession", () => {
  it("deletes a session nobody attended", async () => {
    const sessionId = await sessionOn("2026-11-02");
    await deleteTrainingSession(prisma, groupId, sessionId);
    expect(await prisma.trainingSession.count()).toBe(0);
  });

  it("refuses to delete a session with attendance", async () => {
    const sessionId = await sessionOn("2026-11-02");
    await markAttendance(prisma, { groupId, sessionId, memberId: childId }, TODAY);
    await expect(deleteTrainingSession(prisma, groupId, sessionId)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.attendance.count()).toBe(1);
  });

  it("answers NOT_FOUND for a session of another group", async () => {
    const sessionId = await sessionOn("2026-11-02");
    const trainerId = String((await createLoginMember(prisma, orgId, "trainer", "other@example.com")).memberId);
    const other = await createGroup(prisma, { ownerId: trainerId, days: ["friday"], from: "17:00", to: "18:00" });
    await expect(deleteTrainingSession(prisma, other.id, sessionId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.trainingSession.count()).toBe(1);
  });
});

describe("markAttendance and unmarkAttendance", () => {
  it("ticks and unticks a member, both idempotent", async () => {
    const sessionId = await sessionOn("2026-11-16");
    const target = { groupId, sessionId, memberId: childId };
    await markAttendance(prisma, target, TODAY);
    await markAttendance(prisma, target, TODAY);
    expect(await prisma.attendance.count()).toBe(1);

    await unmarkAttendance(prisma, target);
    await unmarkAttendance(prisma, target);
    expect(await prisma.attendance.count()).toBe(0);
  });

  it("rejects a future session", async () => {
    const sessionId = await sessionOn("2026-11-18");
    await expect(markAttendance(prisma, { groupId, sessionId, memberId: childId }, TODAY)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a member who is not in the group", async () => {
    const sessionId = await sessionOn("2026-11-02");
    const outsider = String((await createLoginMember(prisma, orgId, "child", "outsider@example.com")).memberId);
    await expect(markAttendance(prisma, { groupId, sessionId, memberId: outsider }, TODAY)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(markAttendance(prisma, { groupId, sessionId, memberId: "999999" }, TODAY)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("answers NOT_FOUND for an unknown session or group", async () => {
    await expect(
      markAttendance(prisma, { groupId, sessionId: "999999", memberId: childId }, TODAY),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(unmarkAttendance(prisma, { groupId: "abc", sessionId: "1", memberId: childId })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
  });
});

describe("month rosters", () => {
  const rosterIds = async (month: string) =>
    (await getGroupAttendance(prisma, groupId, month)).members.map((member) => member.id);

  const newChild = async (email: string) =>
    String((await createLoginMember(prisma, orgId, "child", email)).memberId);

  it("copies the group's members when the month gets its first session", async () => {
    await createMonthSessions(prisma, groupId, "2026-10", "2026-10-01");
    const latecomer = await newChild("late@example.com");
    await addGroupMember(prisma, groupId, latecomer, "2026-10-20");
    await sessionOn("2026-12-05");

    expect(await rosterIds("2026-10")).toEqual([childId, latecomer].toSorted());
    expect(await rosterIds("2026-12")).toEqual([childId, latecomer].toSorted());
  });

  it("adds a new group member to the current and later months only", async () => {
    await createMonthSessions(prisma, groupId, "2026-10", "2026-10-01");
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await createMonthSessions(prisma, groupId, "2026-12", TODAY);
    const newcomer = await newChild("new@example.com");
    await addGroupMember(prisma, groupId, newcomer, TODAY);

    expect(await rosterIds("2026-10")).toEqual([childId]);
    expect(await rosterIds("2026-11")).toContain(newcomer);
    expect(await rosterIds("2026-12")).toContain(newcomer);
  });

  it("removes a member who leaves the group from later months only", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await createMonthSessions(prisma, groupId, "2026-12", TODAY);
    await removeGroupMember(prisma, groupId, childId, TODAY);

    expect(await rosterIds("2026-11")).toEqual([childId]);
    expect(await rosterIds("2026-12")).toEqual([]);
  });

  it("adds and removes a group member on one month's roster", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await removeMonthMember(prisma, { groupId, month: "2026-11", memberId: childId });
    expect(await rosterIds("2026-11")).toEqual([]);

    await addMonthMember(prisma, { groupId, month: "2026-11", memberId: childId });
    await addMonthMember(prisma, { groupId, month: "2026-11", memberId: childId });
    expect(await rosterIds("2026-11")).toEqual([childId]);
  });

  it("only adds to a month that has sessions", async () => {
    await expect(addMonthMember(prisma, { groupId, month: "2027-05", memberId: childId })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(await rosterIds("2027-05")).toEqual([]);
  });

  it("refuses ticks on a session of an archived group", async () => {
    const sessionId = await sessionOn("2026-11-09");
    await archiveGroup(prisma, groupId, new Date());
    const target = { groupId, sessionId, memberId: childId };
    await expect(markAttendance(prisma, target, TODAY)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(unmarkAttendance(prisma, target)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("only adds members of the group", async () => {
    const outsider = await newChild("outsider@example.com");
    await expect(addMonthMember(prisma, { groupId, month: "2026-11", memberId: outsider })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("refuses to remove a member with ticks that month", async () => {
    const sessionId = await sessionOn("2026-11-02");
    await markAttendance(prisma, { groupId, sessionId, memberId: childId }, TODAY);
    await expect(removeMonthMember(prisma, { groupId, month: "2026-11", memberId: childId })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("ticks only members on the month's roster", async () => {
    const sessionId = await sessionOn("2026-11-02");
    await removeMonthMember(prisma, { groupId, month: "2026-11", memberId: childId });
    await expect(markAttendance(prisma, { groupId, sessionId, memberId: childId }, TODAY)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

describe("month subscriptions", () => {
  const kids = { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 };
  const target = (month: string) => ({ groupId, month, memberId: childId });
  const subscriptionIn = async (month: string) =>
    (await getGroupAttendance(prisma, groupId, month)).members.find((member) => member.id === childId)?.subscription;

  it("sets a subscription with its price and sessions as they are now", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    const subscription = await createSubscription(prisma, kids);
    await setMonthSubscription(prisma, target("2026-11"), subscription.id);
    await updateSubscription(prisma, subscription.id, { name: "Kids", sessionsPerWeek: 3, price: 6000 });

    expect(await subscriptionIn("2026-11")).toEqual({ id: subscription.id, name: "Kids", sessionsPerWeek: 2, price: 4500 });
  });

  it("clears a subscription", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    const subscription = await createSubscription(prisma, kids);
    await setMonthSubscription(prisma, target("2026-11"), subscription.id);
    await setMonthSubscription(prisma, target("2026-11"), null);

    expect(await subscriptionIn("2026-11")).toBeNull();
  });

  it("carries the latest earlier month's subscription into a new month, at today's price", async () => {
    await createMonthSessions(prisma, groupId, "2026-10", "2026-10-01");
    const subscription = await createSubscription(prisma, kids);
    await setMonthSubscription(prisma, target("2026-10"), subscription.id);
    await updateSubscription(prisma, subscription.id, { ...kids, price: 5000 });
    // November is skipped: December carries over from October.
    await createMonthSessions(prisma, groupId, "2026-12", TODAY);

    expect(await subscriptionIn("2026-12")).toEqual({ id: subscription.id, name: "Kids 2x", sessionsPerWeek: 2, price: 5000 });
  });

  it("carries a cleared subscription as none", async () => {
    const subscription = await createSubscription(prisma, kids);
    await createMonthSessions(prisma, groupId, "2026-10", "2026-10-01");
    await setMonthSubscription(prisma, target("2026-10"), subscription.id);
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await setMonthSubscription(prisma, target("2026-11"), null);
    await createMonthSessions(prisma, groupId, "2026-12", TODAY);

    expect(await subscriptionIn("2026-12")).toBeNull();
  });

  it("carries the subscription when a member is added back to a month", async () => {
    await createMonthSessions(prisma, groupId, "2026-10", "2026-10-01");
    const subscription = await createSubscription(prisma, kids);
    await setMonthSubscription(prisma, target("2026-10"), subscription.id);
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await removeMonthMember(prisma, target("2026-11"));
    await addMonthMember(prisma, target("2026-11"));

    expect((await subscriptionIn("2026-11"))?.id).toBe(subscription.id);
  });

  it("only sets a subscription for a member on the month's roster", async () => {
    const subscription = await createSubscription(prisma, kids);
    await expect(setMonthSubscription(prisma, target("2026-11"), subscription.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("answers NOT_FOUND for an unknown subscription", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await expect(setMonthSubscription(prisma, target("2026-11"), "999999")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("month paid", () => {
  const target = (month: string) => ({ groupId, month, memberId: childId });
  const monthOfChild = async (month: string) =>
    (await getGroupAttendance(prisma, groupId, month)).members.find((member) => member.id === childId);
  const withSubscription = async (month: string) => {
    const subscription = await createSubscription(prisma, { name: "Kids 2x", sessionsPerWeek: 2, price: 4500 });
    await setMonthSubscription(prisma, target(month), subscription.id);
    return subscription;
  };

  it("marks a month with a subscription paid and unpaid", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await withSubscription("2026-11");
    expect((await monthOfChild("2026-11"))?.paid).toBe(false);
    await setMonthPaid(prisma, target("2026-11"), true);
    expect((await monthOfChild("2026-11"))?.paid).toBe(true);
    await setMonthPaid(prisma, target("2026-11"), false);
    expect((await monthOfChild("2026-11"))?.paid).toBe(false);
  });

  it("refuses to mark a month without a subscription paid", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await expect(setMonthPaid(prisma, target("2026-11"), true)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("refuses to clear the subscription of a paid month, but allows switching it", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await withSubscription("2026-11");
    await setMonthPaid(prisma, target("2026-11"), true);
    await expect(setMonthSubscription(prisma, target("2026-11"), null)).rejects.toMatchObject({ code: "CONFLICT" });

    const other = await createSubscription(prisma, { name: "Kids 1x", sessionsPerWeek: 1, price: 3000 });
    await setMonthSubscription(prisma, target("2026-11"), other.id);
    expect(await monthOfChild("2026-11")).toMatchObject({ subscription: { id: other.id }, paid: true });
  });

  it("starts every new month unpaid", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await withSubscription("2026-11");
    await setMonthPaid(prisma, target("2026-11"), true);
    await createMonthSessions(prisma, groupId, "2026-12", TODAY);
    expect(await monthOfChild("2026-12")).toMatchObject({ subscription: { name: "Kids 2x" }, paid: false });
  });

  it("only marks members on the month's roster", async () => {
    await expect(setMonthPaid(prisma, target("2026-11"), false)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("one subscription and payment per member per month", () => {
  let otherGroupId: string;

  beforeEach(async () => {
    const trainerId = String((await createLoginMember(prisma, orgId, "trainer", "other@example.com")).memberId);
    otherGroupId = (await createGroup(prisma, { ownerId: trainerId, days: ["friday"], from: "17:00", to: "18:00" })).id;
    await addGroupMember(prisma, otherGroupId, childId, TODAY);
  });

  const inGroup = async (id: string, month: string) =>
    (await getGroupAttendance(prisma, id, month)).members.find((member) => member.id === childId);

  it("shows a subscription and payment set in one group in every group", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await createMonthSessions(prisma, otherGroupId, "2026-11", TODAY);
    const subscription = await createSubscription(prisma, { name: "Kids 3x", sessionsPerWeek: 3, price: 6000 });
    await setMonthSubscription(prisma, { groupId, month: "2026-11", memberId: childId }, subscription.id);
    await setMonthPaid(prisma, { groupId: otherGroupId, month: "2026-11", memberId: childId }, true);

    for (const id of [groupId, otherGroupId]) {
      expect(await inGroup(id, "2026-11")).toMatchObject({ subscription: { id: subscription.id }, paid: true });
    }
  });

  it("shows a comment set in one group in every group, and clears it", async () => {
    await createMonthSessions(prisma, groupId, "2026-11", TODAY);
    await createMonthSessions(prisma, otherGroupId, "2026-11", TODAY);
    await setMonthComment(prisma, { groupId, month: "2026-11", memberId: childId }, "Injured knee");

    for (const id of [groupId, otherGroupId]) {
      expect((await inGroup(id, "2026-11"))?.comment).toBe("Injured knee");
    }

    await setMonthComment(prisma, { groupId: otherGroupId, month: "2026-11", memberId: childId }, null);
    expect((await inGroup(groupId, "2026-11"))?.comment).toBeNull();
  });

  it("carries the subscription from another group's earlier month", async () => {
    await createMonthSessions(prisma, groupId, "2026-10", "2026-10-01");
    const subscription = await createSubscription(prisma, { name: "Kids 3x", sessionsPerWeek: 3, price: 6000 });
    await setMonthSubscription(prisma, { groupId, month: "2026-10", memberId: childId }, subscription.id);
    await createMonthSessions(prisma, otherGroupId, "2026-11", TODAY);

    expect((await inGroup(otherGroupId, "2026-11"))?.subscription?.id).toBe(subscription.id);
  });
});
