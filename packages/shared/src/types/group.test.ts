import { describe, expect, it } from "vitest";
import { createGroupBody, groupResponse } from "./group.js";

const validBody = { ownerId: "1", days: ["monday", "wednesday"], from: "17:00", to: "18:30" };

describe("createGroupBody", () => {
  it("accepts an owner, days and a time range", () => {
    expect(createGroupBody.parse(validBody)).toEqual(validBody);
  });

  it.each([
    ["no days", { days: [] }],
    ["an unknown day", { days: ["funday"] }],
    ["the same day twice", { days: ["monday", "monday"] }],
    ["a time without minutes", { from: "17" }],
    ["an hour past 23", { to: "24:00" }],
    ["an end before the start", { from: "18:30", to: "17:00" }],
    ["an end equal to the start", { from: "17:00", to: "17:00" }],
  ])("rejects %s", (_label, override) => {
    expect(createGroupBody.safeParse({ ...validBody, ...override }).success).toBe(false);
  });
});

describe("groupResponse", () => {
  it("requires ISO datetimes for createdAt and updatedAt", () => {
    const value = {
      id: "1",
      owner: { id: "2", name: "Petra", surname: "Kovač" },
      days: ["monday"],
      from: "17:00",
      to: "18:30",
      createdAt: "2026-11-15T17:00:22.251Z",
      updatedAt: "2026-11-15T17:00:22.251Z",
    };
    expect(groupResponse.parse(value)).toEqual(value);
    expect(groupResponse.safeParse({ ...value, updatedAt: "2026-11-15" }).success).toBe(false);
  });
});
