import { describe, expect, it } from "vitest";
import type { MemberResponse, MemberRole } from "../types/member.js";
import type { ApiClient } from "./apiClient.js";
import { archiveGroup, groupKeys, groupMemberCandidates } from "./groups.js";

const member = (id: string, role: MemberRole): MemberResponse => ({
  id,
  orgId: "1",
  name: "Ana",
  surname: "Horvat",
  birthday: "2014-03-12",
  role,
  taxNumber: null,
  email: null,
  phone: null,
  guardians: [],
  createdAt: "2026-11-15T17:00:22.251Z",
});

describe("groupKeys", () => {
  it("nests every group query under the same root, so one invalidation covers all", () => {
    expect(groupKeys.list().slice(0, 1)).toEqual(groupKeys.all);
    expect(groupKeys.detail("7").slice(0, 1)).toEqual(groupKeys.all);
    expect(groupKeys.members("7").slice(0, 1)).toEqual(groupKeys.all);
  });
});

describe("groupMemberCandidates", () => {
  it("keeps children and members who are not in the group yet", () => {
    const members = [member("1", "child"), member("2", "member"), member("3", "trainer"), member("4", "admin")];
    const current = [member("2", "member")];
    expect(groupMemberCandidates(members, current).map((candidate) => candidate.id)).toEqual(["1"]);
  });
});

describe("archiveGroup", () => {
  it("sends DELETE to the group and accepts an empty answer", async () => {
    const calls: { path: string; method: string | undefined }[] = [];
    const api: ApiClient = {
      fetch: async (path, schema, init) => {
        calls.push({ path, method: init?.method });
        return schema.parse(undefined);
      },
    };
    expect(await archiveGroup(api, "3")).toBeUndefined();
    expect(calls).toEqual([{ path: "/groups/3", method: "DELETE" }]);
  });
});
