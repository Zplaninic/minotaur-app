import { describe, expect, it } from "vitest";
import { createTrainingSessionBody, groupAttendanceResponse, monthMemberParams, monthQuery } from "./attendance.js";

describe("monthQuery", () => {
  it("accepts YYYY-MM", () => {
    expect(monthQuery.parse({ month: "2026-11" })).toEqual({ month: "2026-11" });
  });

  it.each(["2026-13", "2026-00", "2026-1", "2026-11-02", "november", "2026-08", "2025-12"])("rejects %s", (value) => {
    expect(monthQuery.safeParse({ month: value }).success).toBe(false);
  });
});

describe("createTrainingSessionBody", () => {
  it("requires an ISO date", () => {
    expect(createTrainingSessionBody.parse({ date: "2026-11-02" })).toEqual({ date: "2026-11-02" });
    expect(createTrainingSessionBody.safeParse({ date: "2.11.2026" }).success).toBe(false);
    expect(createTrainingSessionBody.safeParse({ date: "2026-11-02T18:00:00.000Z" }).success).toBe(false);
  });
});

describe("groupAttendanceResponse", () => {
  it("accepts sessions and members with the sessions they attended", () => {
    const value = {
      sessions: [
        { id: "1", date: "2026-11-02" },
        { id: "2", date: "2026-11-04" },
      ],
      members: [{ id: "7", name: "Leo", surname: "Perić", attendedSessionIds: ["1"] }],
    };
    expect(groupAttendanceResponse.parse(value)).toEqual(value);
  });
});

describe("monthMemberParams", () => {
  it("requires a YYYY-MM month", () => {
    expect(monthMemberParams.safeParse({ id: "1", month: "2026-11", memberId: "4" }).success).toBe(true);
    expect(monthMemberParams.safeParse({ id: "1", month: "2026-11-01", memberId: "4" }).success).toBe(false);
  });
});
