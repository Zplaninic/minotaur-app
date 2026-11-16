import { describe, expect, it } from "vitest";
import { subscriptionBody, subscriptionResponse } from "./subscription.js";

const validBody = { name: "Kids 2x", sessionsPerWeek: 2, price: 4550 };

describe("subscriptionBody", () => {
  it("accepts a name, sessions per week and a price in cents", () => {
    expect(subscriptionBody.parse(validBody)).toEqual(validBody);
  });

  it("trims the name", () => {
    expect(subscriptionBody.parse({ ...validBody, name: "  Kids 2x " }).name).toBe("Kids 2x");
  });

  it("accepts a free subscription", () => {
    expect(subscriptionBody.safeParse({ ...validBody, price: 0 }).success).toBe(true);
  });

  it.each([
    ["an empty name", { name: "   " }],
    ["a name over 100 characters", { name: "x".repeat(101) }],
    ["no sessions", { sessionsPerWeek: 0 }],
    ["more than 7 sessions", { sessionsPerWeek: 8 }],
    ["a fractional session count", { sessionsPerWeek: 1.5 }],
    ["a negative price", { price: -1 }],
    ["a fractional price", { price: 45.5 }],
    ["a price above the maximum", { price: 100_000_000 }],
  ])("rejects %s", (_label, override) => {
    expect(subscriptionBody.safeParse({ ...validBody, ...override }).success).toBe(false);
  });
});

describe("subscriptionResponse", () => {
  it("requires ISO datetimes for createdAt and updatedAt", () => {
    const value = {
      id: "1",
      ...validBody,
      createdAt: "2026-11-16T10:00:00.000Z",
      updatedAt: "2026-11-16T10:00:00.000Z",
    };
    expect(subscriptionResponse.parse(value)).toEqual(value);
    expect(subscriptionResponse.safeParse({ ...value, createdAt: "2026-11-16" }).success).toBe(false);
  });
});
