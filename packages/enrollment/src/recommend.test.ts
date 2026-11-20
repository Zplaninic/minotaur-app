import { describe, expect, it } from "vitest";
import { fitsAge, recommendGroups, type GroupCapacity } from "./recommend.js";

const group = (id: string, overrides: Partial<GroupCapacity<string>> = {}): GroupCapacity<string> => ({
  id,
  ageFrom: null,
  ageTo: null,
  maxMembers: null,
  members: 0,
  pending: 0,
  ...overrides,
});

describe("fitsAge", () => {
  it("counts ages in whole years and treats null as an open end", () => {
    expect(fitsAge(4.5, { ageFrom: 4, ageTo: 6 })).toBe(true);
    expect(fitsAge(6.9, { ageFrom: 4, ageTo: 6 })).toBe(true);
    expect(fitsAge(3.9, { ageFrom: 4, ageTo: 6 })).toBe(false);
    expect(fitsAge(40, { ageFrom: 18, ageTo: null })).toBe(true);
    expect(fitsAge(2, { ageFrom: null, ageTo: null })).toBe(true);
  });
});

describe("recommendGroups", () => {
  it("leaves out groups for other ages", () => {
    expect(recommendGroups(9, [group("small", { ageFrom: 4, ageTo: 6 })])).toEqual([]);
  });

  it("ranks by free spots, counting pending requests, with full groups last", () => {
    const groups = [
      group("full", { maxMembers: 10, members: 9, pending: 1 }),
      group("two", { maxMembers: 10, members: 8 }),
      group("five", { maxMembers: 10, members: 4, pending: 1 }),
    ];
    expect(recommendGroups(5, groups)).toEqual([
      { groupId: "five", freeSpots: 5, full: false },
      { groupId: "two", freeSpots: 2, full: false },
      { groupId: "full", freeSpots: 0, full: true },
    ]);
  });

  it("puts a group without a limit before groups with one", () => {
    const groups = [group("limited", { maxMembers: 20 }), group("open")];
    expect(recommendGroups(5, groups).map((recommendation) => recommendation.groupId)).toEqual(["open", "limited"]);
  });

  it("prefers the narrowest age range that has room over open groups", () => {
    const groups = [
      group("open", { members: 2 }),
      group("fiveToSeven", { ageFrom: 5, ageTo: 7, maxMembers: 7, members: 8 }),
      group("upToThirteen", { ageTo: 13, members: 9 }),
      group("fifteenPlus", { ageFrom: 15, members: 9 }),
    ];
    expect(recommendGroups(6, groups)[0]?.groupId).toBe("upToThirteen");
    expect(recommendGroups(20, groups)[0]?.groupId).toBe("fifteenPlus");
    expect(recommendGroups(6, groups).at(-1)?.groupId).toBe("fiveToSeven");
  });

  it("sends a child to the smaller of two equal groups without limits", () => {
    const groups = [group("big", { members: 13 }), group("small", { members: 9, pending: 1 })];
    expect(recommendGroups(30, groups)[0]?.groupId).toBe("small");
  });

  it("never reports fewer than 0 free spots for a group over its limit", () => {
    expect(recommendGroups(5, [group("over", { maxMembers: 5, members: 7 })])).toEqual([
      { groupId: "over", freeSpots: 0, full: true },
    ]);
  });
});
