import { describe, expect, it } from "vitest";
import type { ApiClient } from "./apiClient.js";
import { formatCalendarDate, formatSortedName } from "./format.js";
import { fetchAllMembers, memberKeys, nextMembersPage } from "./members.js";

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
    expect(memberKeys.everyone().slice(0, 1)).toEqual(memberKeys.all);
  });
});

describe("fetchAllMembers", () => {
  it("asks for page after page until the last one", async () => {
    const paths: string[] = [];
    const api: ApiClient = {
      fetch: async (path, schema) => {
        paths.push(path);
        return schema.parse({ items: [], page: paths.length, pageSize: 100, total: 150 });
      },
    };
    expect(await fetchAllMembers(api)).toEqual([]);
    expect(paths).toEqual(["/members?page=1&pageSize=100", "/members?page=2&pageSize=100"]);
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
