import { describe, expect, it } from "vitest";
import type { GroupResponse } from "../types/group.js";
import { emptyGroupDraft, groupToDraft, toggleWeekday, validateGroupDraft, type GroupDraft } from "./groupDraft.js";
import { groupKeys } from "./groups.js";
import { formatTimeOfDay, fromTimeOfDay, toTimeOfDay } from "./timeOfDay.js";

const valid: GroupDraft = {
  ownerId: "2",
  days: ["monday", "wednesday"],
  from: "17:00",
  to: "18:30",
  ageFrom: "",
  ageTo: "",
};

describe("validateGroupDraft", () => {
  it("turns a complete draft into a request body", () => {
    expect(validateGroupDraft(valid)).toEqual({ ok: true, body: { ...valid, ageFrom: null, ageTo: null } });
  });

  it.each([
    ["both ends", " 7 ", "10", 7, 10],
    ["only the lower end", "7", "", 7, null],
    ["only the upper end", "", "10", null, 10],
    ["the same age twice", "7", "7", 7, 7],
  ])("accepts an age range with %s", (_label, ageFrom, ageTo, bodyFrom, bodyTo) => {
    expect(validateGroupDraft({ ...valid, ageFrom, ageTo })).toEqual({
      ok: true,
      body: { ...valid, ageFrom: bodyFrom, ageTo: bodyTo },
    });
  });

  it.each(["seven", "7.5", "-1", "100"])("rejects the age %s", (age) => {
    expect(validateGroupDraft({ ...valid, ageFrom: age })).toEqual({ ok: false, errors: { ageFrom: "age" } });
  });

  it("reports an upper age below the lower age", () => {
    expect(validateGroupDraft({ ...valid, ageFrom: "10", ageTo: "7" })).toEqual({
      ok: false,
      errors: { ageTo: "ageOrder" },
    });
  });

  it("names every missing field of an empty draft", () => {
    expect(validateGroupDraft(emptyGroupDraft)).toEqual({
      ok: false,
      errors: { ownerId: "owner", days: "days", from: "from", to: "to" },
    });
  });

  it("reports an end that is not after the start", () => {
    expect(validateGroupDraft({ ...valid, from: "18:30", to: "17:00" })).toEqual({
      ok: false,
      errors: { to: "timeOrder" },
    });
  });
});

describe("groupToDraft", () => {
  it("fills the form from a saved group", () => {
    const group: GroupResponse = {
      id: "1",
      owner: { id: "2", name: "Petra", surname: "Kovač" },
      days: ["monday", "wednesday"],
      from: "17:00",
      to: "18:30",
      ageFrom: 7,
      ageTo: null,
      memberCount: 0,
      createdAt: "2026-11-15T17:00:22.251Z",
      updatedAt: "2026-11-15T17:00:22.251Z",
    };
    expect(groupToDraft(group)).toEqual({ ...valid, ageFrom: "7", ageTo: "" });
  });
});

describe("toggleWeekday", () => {
  it("adds a day in week order", () => {
    expect(toggleWeekday(["wednesday"], "monday")).toEqual(["monday", "wednesday"]);
  });

  it("removes a day that is already chosen", () => {
    expect(toggleWeekday(["monday", "wednesday"], "monday")).toEqual(["wednesday"]);
  });
});

describe("groupKeys", () => {
  it("nests the list under the root, so one invalidation covers it", () => {
    expect(groupKeys.list().slice(0, 1)).toEqual(groupKeys.all);
  });
});

describe("time of day", () => {
  it("formats in the given locale", () => {
    expect(formatTimeOfDay("17:30", "en")).toBe("5:30 PM");
    expect(formatTimeOfDay("17:30", "hr")).toBe("17:30");
  });

  it("round-trips through a local Date", () => {
    expect(toTimeOfDay(fromTimeOfDay("07:05"))).toBe("07:05");
  });
});
