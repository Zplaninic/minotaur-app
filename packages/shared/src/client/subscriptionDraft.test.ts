import { describe, expect, it } from "vitest";
import { formatMoney, formatShortMonth } from "./format.js";
import {
  centsToEuroInput,
  emptySubscriptionDraft,
  parseEuros,
  subscriptionToDraft,
  validateSubscriptionDraft,
} from "./subscriptionDraft.js";

describe("parseEuros", () => {
  it.each([
    ["45", 4500],
    ["45,5", 4550],
    ["45.50", 4550],
    [" 0,05 ", 5],
    ["0", 0],
  ])("reads %j as %i cents", (input, cents) => {
    expect(parseEuros(input)).toBe(cents);
  });

  it.each(["", "abc", "45,555", "-5", "1.234,50", "1234567"])("rejects %j", (input) => {
    expect(parseEuros(input)).toBeUndefined();
  });
});

describe("centsToEuroInput", () => {
  it.each([
    [4500, "45"],
    [4550, "45.50"],
    [5, "0.05"],
  ])("writes %i cents as %j", (cents, input) => {
    expect(centsToEuroInput(cents)).toBe(input);
  });
});

describe("validateSubscriptionDraft", () => {
  it("turns a complete draft into a request body", () => {
    expect(validateSubscriptionDraft({ name: " Kids 2x ", sessionsPerWeek: "2", price: "45,50" })).toEqual({
      ok: true,
      body: { name: "Kids 2x", sessionsPerWeek: 2, price: 4550 },
    });
  });

  it("names every missing field of an empty draft", () => {
    expect(validateSubscriptionDraft(emptySubscriptionDraft)).toEqual({
      ok: false,
      errors: { name: "name", sessionsPerWeek: "sessionsPerWeek", price: "price" },
    });
  });

  it("round-trips an existing subscription", () => {
    const draft = subscriptionToDraft({
      id: "1",
      name: "Adults 3x",
      sessionsPerWeek: 3,
      price: 6000,
      createdAt: "2026-11-16T10:00:00.000Z",
      updatedAt: "2026-11-16T10:00:00.000Z",
    });
    expect(draft).toEqual({ name: "Adults 3x", sessionsPerWeek: "3", price: "60" });
    expect(validateSubscriptionDraft(draft)).toEqual({
      ok: true,
      body: { name: "Adults 3x", sessionsPerWeek: 3, price: 6000 },
    });
  });
});

describe("formatMoney", () => {
  it("formats cents as euros", () => {
    expect(formatMoney(4550, "en")).toBe("€45.50");
  });
});

describe("formatShortMonth", () => {
  it("names a month in short", () => {
    expect(formatShortMonth("2026-10", "en")).toBe("Oct 2026");
  });
});
