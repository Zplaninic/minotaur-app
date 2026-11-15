import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatSortedName } from "./format.js";
import { memberKeys, nextMembersPage } from "./members.js";

describe("nextMembersPage", () => {
  it("returns the next page while members remain", () => {
    expect(nextMembersPage({ items: [], page: 1, pageSize: 20, total: 21 })).toBe(2);
  });

  it("returns undefined after the last page", () => {
    expect(nextMembersPage({ items: [], page: 2, pageSize: 20, total: 40 })).toBeUndefined();
  });
});

describe("memberKeys", () => {
  it("nests every member query under the same root, so one invalidation covers all", () => {
    expect(memberKeys.list({ page: 1, pageSize: 20 }).slice(0, 1)).toEqual(memberKeys.all);
    expect(memberKeys.pages(20).slice(0, 1)).toEqual(memberKeys.all);
  });
});

describe("format", () => {
  it("formats a calendar date without shifting the day", () => {
    expect(formatCalendarDate("2014-03-12", "en")).toBe("Mar 12, 2014");
  });

  it("puts the surname first for sorted lists", () => {
    expect(formatSortedName({ name: "Ana", surname: "Horvat" })).toBe("Horvat Ana");
  });
});
