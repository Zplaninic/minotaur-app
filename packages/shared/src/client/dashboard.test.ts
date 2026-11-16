import { describe, expect, it } from "vitest";
import type { GroupResponse, Weekday } from "../types/group.js";
import { attendanceRate, groupsTrainingOn, weekdayOfDate } from "./dashboard.js";

const group = (id: string, ownerId: string, days: Weekday[], from: string): GroupResponse => ({
  id,
  owner: { id: ownerId, name: "Iva", surname: "Kovač" },
  days,
  from,
  to: "23:00",
  memberCount: 0,
  createdAt: "2026-11-15T17:00:22.251Z",
  updatedAt: "2026-11-15T17:00:22.251Z",
});

describe("weekdayOfDate", () => {
  it("names the weekday of a calendar date", () => {
    expect(weekdayOfDate("2026-11-16")).toBe("monday");
    expect(weekdayOfDate("2026-11-22")).toBe("sunday");
  });
});

describe("groupsTrainingOn", () => {
  it("keeps the groups training that day, the owner's own first, then by start time", () => {
    const groups = [
      group("1", "9", ["monday"], "17:00"),
      group("2", "5", ["monday", "wednesday"], "18:00"),
      group("3", "9", ["monday"], "16:00"),
      group("4", "5", ["tuesday"], "10:00"),
      group("5", "5", ["monday"], "19:00"),
    ];
    expect(groupsTrainingOn(groups, "2026-11-16", "5").map((g) => g.id)).toEqual(["2", "5", "3", "1"]);
  });

  it("sorts by start time when the viewer owns no group", () => {
    const groups = [group("1", "9", ["monday"], "17:00"), group("2", "8", ["monday"], "16:00")];
    expect(groupsTrainingOn(groups, "2026-11-16", undefined).map((g) => g.id)).toEqual(["2", "1"]);
  });
});

describe("attendanceRate", () => {
  it("is the attended share of what was expected", () => {
    expect(attendanceRate({ expected: 8, attended: 6 })).toBe(0.75);
  });

  it("is undefined when nothing was expected", () => {
    expect(attendanceRate({ expected: 0, attended: 0 })).toBeUndefined();
  });
});
