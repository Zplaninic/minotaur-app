import { describe, expect, it } from "vitest";
import { emptyGroupDraft, toggleWeekday, validateGroupDraft, type GroupDraft } from "./groupDraft.js";
import { groupKeys } from "./groups.js";
import { formatTimeOfDay, fromTimeOfDay, toTimeOfDay } from "./timeOfDay.js";

const valid: GroupDraft = { ownerId: "2", days: ["monday", "wednesday"], from: "17:00", to: "18:30" };

describe("validateGroupDraft", () => {
  it("turns a complete draft into a request body", () => {
    expect(validateGroupDraft(valid)).toEqual({ ok: true, body: valid });
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
