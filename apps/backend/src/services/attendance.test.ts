import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createLoginMember, createOrg, resetDb } from "../../test/db.js";
import { prisma } from "../db/client.js";
import {
  addMonthMember,
  addTrainingSession,
  createMonthSessions,
  deleteTrainingSession,
  getGroupAttendance,
  isoDateIn,
  markAttendance,
  removeMonthMember,
  trainingDates,
  unmarkAttendance,
} from "./attendance.js";
import { addGroupMember, archiveGroup, createGroup, removeGroupMember } from "./groups.js";

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

describe("trainingDates", () => {
  it("lists every Monday and Wednesday of November 2026", () => {
    expect(trainingDates("2026-11", ["monday", "wednesday"])).toEqual([
      "2026-11-02",
      "2026-11-04",
      "2026-11-09",
      "2026-11-11",
      "2026-11-16",
      "2026-11-18",
      "2026-11-23",
      "2026-11-25",
      "2026-11-30",
    ]);
  });

  it("includes the first and last day of the month", () => {
    expect(trainingDates("2026-12", ["tuesday", "thursday"]).at(0)).toBe("2026-12-01");
    expect(trainingDates("2026-12", ["thursday"]).at(-1)).toBe("2026-12-31");
    expect(trainingDates("2027-02", ["sunday"])).toEqual(["2027-02-07", "2027-02-14", "2027-02-21", "2027-02-28"]);
  });
});

describe("isoDateIn", () => {
  it("returns the day in the given time zone", () => {
    const lateEvening = new Date("2026-11-16T23:30:00.000Z");
    expect(isoDateIn(lateEvening, "UTC")).toBe("2026-11-16");
    expect(isoDateIn(lateEvening, "Europe/Zagreb")).toBe("2026-11-17");
  });
});

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
      { id: childId, name: "Test", surname: "child", attendedSessionIds: [second] },
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
