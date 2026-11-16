import { describe, expect, it } from "vitest";
import { overduePaymentsResponse, subscriptionSummaryQuery, subscriptionSummaryResponse } from "./payment.js";

describe("subscriptionSummaryQuery", () => {
  it("takes a month from September 2026 on", () => {
    expect(subscriptionSummaryQuery.parse({ month: "2026-11" })).toEqual({ month: "2026-11" });
    expect(subscriptionSummaryQuery.safeParse({ month: "2026-08" }).success).toBe(false);
  });
});

describe("subscriptionSummaryResponse", () => {
  it("allows totals above a single price's maximum", () => {
    const value = {
      month: "2026-11",
      members: 2,
      paid: 1,
      unpaid: 1,
      expected: 200_000_000,
      collected: 100_000_000,
      open: 100_000_000,
      bySubscription: [{ id: "1", name: "Kids 2x", members: 2, paid: 1, expected: 200_000_000, collected: 100_000_000 }],
    };
    expect(subscriptionSummaryResponse.parse(value)).toEqual(value);
  });
});

describe("overduePaymentsResponse", () => {
  it("lists members with their unpaid months", () => {
    const value = {
      items: [
        {
          id: "4",
          name: "Leo",
          surname: "Perić",
          months: [{ month: "2026-10", subscription: { id: "1", name: "Kids 1x" }, price: 3000 }],
          total: 3000,
        },
      ],
      total: 3000,
    };
    expect(overduePaymentsResponse.parse(value)).toEqual(value);
  });
});
