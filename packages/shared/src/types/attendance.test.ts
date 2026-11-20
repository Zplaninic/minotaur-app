import { describe, expect, it } from "vitest";
import {
  createTrainingSessionBody,
  groupAttendanceResponse,
  monthMemberParams,
  monthQuery,
  MAX_MONTH_COMMENT_LENGTH,
  setMonthCommentBody,
  setMonthPaidBody,
  setMonthSubscriptionBody,
} from "./attendance.js";

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
      members: [
        {
          id: "7",
          name: "Leo",
          surname: "Perić",
          attendedSessionIds: ["1"],
          subscription: null,
          paid: false,
          comment: null,
          isNew: false,
        },
        {
          id: "8",
          name: "Nora",
          surname: "Jurić",
          attendedSessionIds: [],
          subscription: { id: "3", name: "Kids 2x", sessionsPerWeek: 2, price: 4500 },
          paid: true,
          comment: "Injured knee",
          isNew: true,
        },
      ],
    };
    expect(groupAttendanceResponse.parse(value)).toEqual(value);
  });
});

describe("setMonthSubscriptionBody", () => {
  it("takes a subscription id or null", () => {
    expect(setMonthSubscriptionBody.parse({ subscriptionId: "3" })).toEqual({ subscriptionId: "3" });
    expect(setMonthSubscriptionBody.parse({ subscriptionId: null })).toEqual({ subscriptionId: null });
    expect(setMonthSubscriptionBody.safeParse({}).success).toBe(false);
    expect(setMonthSubscriptionBody.safeParse({ subscriptionId: "" }).success).toBe(false);
  });
});

describe("monthMemberParams", () => {
  it("requires a YYYY-MM month", () => {
    expect(monthMemberParams.safeParse({ id: "1", month: "2026-11", memberId: "4" }).success).toBe(true);
    expect(monthMemberParams.safeParse({ id: "1", month: "2026-11-01", memberId: "4" }).success).toBe(false);
  });
});

describe("setMonthPaidBody", () => {
  it("takes a boolean", () => {
    expect(setMonthPaidBody.parse({ paid: true })).toEqual({ paid: true });
    expect(setMonthPaidBody.safeParse({ paid: "yes" }).success).toBe(false);
    expect(setMonthPaidBody.safeParse({}).success).toBe(false);
  });
});

describe("setMonthCommentBody", () => {
  it("trims the comment and turns blank text into null", () => {
    expect(setMonthCommentBody.parse({ comment: " Injured knee " })).toEqual({ comment: "Injured knee" });
    expect(setMonthCommentBody.parse({ comment: "  " })).toEqual({ comment: null });
    expect(setMonthCommentBody.parse({ comment: null })).toEqual({ comment: null });
  });

  it("rejects a missing or too long comment", () => {
    expect(setMonthCommentBody.safeParse({}).success).toBe(false);
    expect(setMonthCommentBody.safeParse({ comment: "a".repeat(MAX_MONTH_COMMENT_LENGTH + 1) }).success).toBe(false);
  });
});
