import { describe, expect, it } from "vitest";
import {
  applyAttendanceChange,
  attendanceKeys,
  canCreateSessionsIn,
  hasPreviousMonth,
  hasPreviousSession,
  isFutureDate,
  monthRosterCandidates,
  resolveSession,
  sessionDateRange,
  sessionHasAttendance,
  shiftMonth,
  stepSession,
  toMonth,
} from "./attendance.js";
import { formatMonth, formatSessionDate } from "./format.js";

const sessions = [
  { id: "1", date: "2026-11-02" },
  { id: "2", date: "2026-11-04" },
  { id: "3", date: "2026-11-09" },
];

describe("attendanceKeys", () => {
  it("nests every month under the same root, so one invalidation covers all", () => {
    expect(attendanceKeys.month("7", "2026-11").slice(0, 1)).toEqual(attendanceKeys.all);
  });
});

describe("months", () => {
  it("formats the local month of a date", () => {
    expect(toMonth(new Date(2026, 0, 31))).toBe("2026-01");
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 0)).toBe("2026-11");
  });
});

describe("isFutureDate", () => {
  it("treats today as not in the future", () => {
    expect(isFutureDate("2026-11-16", "2026-11-16")).toBe(false);
    expect(isFutureDate("2026-11-17", "2026-11-16")).toBe(true);
    expect(isFutureDate("2026-10-31", "2026-11-16")).toBe(false);
  });
});

describe("resolveSession", () => {
  it("picks the last session that is not in the future", () => {
    expect(resolveSession(sessions, { kind: "latest" }, "2026-11-05")?.id).toBe("2");
    expect(resolveSession(sessions, { kind: "latest" }, "2026-11-04")?.id).toBe("2");
  });

  it("picks the first session when all are in the future", () => {
    expect(resolveSession(sessions, { kind: "latest" }, "2026-10-01")?.id).toBe("1");
  });

  it("picks by position or id, falling back to latest for an unknown id", () => {
    expect(resolveSession(sessions, { kind: "first" }, "2026-11-30")?.id).toBe("1");
    expect(resolveSession(sessions, { kind: "last" }, "2026-10-01")?.id).toBe("3");
    expect(resolveSession(sessions, { kind: "id", id: "1" }, "2026-11-30")?.id).toBe("1");
    expect(resolveSession(sessions, { kind: "id", id: "99" }, "2026-11-30")?.id).toBe("3");
  });

  it("returns nothing for a month without sessions", () => {
    expect(resolveSession([], { kind: "latest" }, "2026-11-16")).toBeUndefined();
  });
});

describe("stepSession", () => {
  it("moves within the month", () => {
    expect(stepSession(sessions, "2026-11", "2", 1)).toEqual({ month: "2026-11", pick: { kind: "id", id: "3" } });
    expect(stepSession(sessions, "2026-11", "2", -1)).toEqual({ month: "2026-11", pick: { kind: "id", id: "1" } });
  });

  it("moves to the neighbouring month past either end", () => {
    expect(stepSession(sessions, "2026-11", "3", 1)).toEqual({ month: "2026-12", pick: { kind: "first" } });
    expect(stepSession(sessions, "2026-11", "1", -1)).toEqual({ month: "2026-10", pick: { kind: "last" } });
    expect(stepSession([], "2026-11", undefined, -1)).toEqual({ month: "2026-10", pick: { kind: "last" } });
  });
});

describe("applyAttendanceChange", () => {
  const data = {
    sessions,
    members: [
      { id: "7", name: "Leo", surname: "Perić", attendedSessionIds: ["1"] },
      { id: "8", name: "Nora", surname: "Jurić", attendedSessionIds: [] },
    ],
  };

  it("ticks and unticks one member only", () => {
    const ticked = applyAttendanceChange(data, { sessionId: "2", memberId: "7", attended: true });
    expect(ticked.members.map((member) => member.attendedSessionIds)).toEqual([["1", "2"], []]);
    const unticked = applyAttendanceChange(ticked, { sessionId: "1", memberId: "7", attended: false });
    expect(unticked.members[0]?.attendedSessionIds).toEqual(["2"]);
  });

  it("does not tick twice", () => {
    const again = applyAttendanceChange(data, { sessionId: "1", memberId: "7", attended: true });
    expect(again.members[0]?.attendedSessionIds).toEqual(["1"]);
  });

  it("tells which sessions have attendance", () => {
    expect(sessionHasAttendance(data, "1")).toBe(true);
    expect(sessionHasAttendance(data, "2")).toBe(false);
  });
});

describe("format", () => {
  it("formats session dates and months without shifting the day", () => {
    expect(formatSessionDate("2026-11-02", "en")).toBe("Mon, Nov 2");
    expect(formatMonth("2026-11", "en")).toBe("November 2026");
  });
});

describe("monthRosterCandidates", () => {
  it("keeps group members who are not on the roster", () => {
    const group = [
      { id: "4", name: "Leo" },
      { id: "5", name: "Nora" },
      { id: "6", name: "Mia" },
    ];
    expect(monthRosterCandidates(group, [{ id: "5" }]).map((member) => member.id)).toEqual(["4", "6"]);
  });
});

describe("creating sessions", () => {
  it("is allowed for the current and the next month only", () => {
    expect(["2026-10", "2026-11", "2026-12", "2027-01"].map((month) => canCreateSessionsIn(month, "2026-11-16"))).toEqual(
      [false, true, true, false],
    );
    expect(canCreateSessionsIn("2027-01", "2026-12-31")).toBe(true);
  });

  it("limits new session dates to the two months", () => {
    expect(sessionDateRange("2026-11-16")).toEqual({ min: "2026-11-01", max: "2026-12-31" });
    expect(sessionDateRange("2026-12-05")).toEqual({ min: "2026-12-01", max: "2027-01-31" });
    expect(sessionDateRange("2027-01-10")).toEqual({ min: "2027-01-01", max: "2027-02-28" });
  });
});

describe("the first month", () => {
  it("has no month before it", () => {
    expect(hasPreviousMonth("2026-09")).toBe(false);
    expect(hasPreviousMonth("2026-10")).toBe(true);
  });

  it("has no session before its first one", () => {
    const september = [
      { id: "1", date: "2026-09-02" },
      { id: "2", date: "2026-09-07" },
    ];
    expect(hasPreviousSession(september, "2026-09", "1")).toBe(false);
    expect(hasPreviousSession(september, "2026-09", "2")).toBe(true);
    expect(hasPreviousSession([], "2026-09", undefined)).toBe(false);
    expect(hasPreviousSession([], "2026-10", undefined)).toBe(true);
  });
});
