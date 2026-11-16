import { describe, expect, it } from "vitest";
import { overdueMonthsOf, subscriptionKeys } from "./subscriptions.js";

describe("subscriptionKeys", () => {
  it("keeps the summary and overdue list under the subscriptions key", () => {
    expect(subscriptionKeys.summary("2026-11").slice(0, 1)).toEqual(subscriptionKeys.all);
    expect(subscriptionKeys.overdue().slice(0, 1)).toEqual(subscriptionKeys.all);
  });
});

describe("overdueMonthsOf", () => {
  const overdue = {
    items: [
      {
        id: "4",
        months: [{ month: "2026-09" }, { month: "2026-10" }],
      },
    ],
  };

  it("returns a member's unpaid months", () => {
    expect(overdueMonthsOf(overdue, "4")).toEqual(["2026-09", "2026-10"]);
  });

  it("returns none for a member who owes nothing or before the list loads", () => {
    expect(overdueMonthsOf(overdue, "5")).toEqual([]);
    expect(overdueMonthsOf(undefined, "4")).toEqual([]);
  });
});
