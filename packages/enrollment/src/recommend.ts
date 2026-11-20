// A group as the recommendation sees it. Id is whatever the caller uses.
export type GroupCapacity<Id> = {
  id: Id;
  // Age range in whole years; null is an open end.
  ageFrom: number | null;
  ageTo: number | null;
  // Null means no limit.
  maxMembers: number | null;
  // Members in the group now.
  members: number;
  // Open requests already recommended to this group.
  pending: number;
};

export type GroupRecommendation<Id> = {
  groupId: Id;
  // Places left, never below 0. Null when the group has no limit.
  freeSpots: number | null;
  full: boolean;
};

// An open end counts as reaching this age, so open ranges are the widest.
const OPEN_AGE_LIMIT = 100;

// How many years of age the group takes. A 5–7 group is a closer fit for a
// six-year-old than an open group for everyone.
const rangeWidth = (group: Pick<GroupCapacity<unknown>, "ageFrom" | "ageTo">): number =>
  (group.ageTo ?? OPEN_AGE_LIMIT) - (group.ageFrom ?? 0);

type Candidate<Id> = GroupRecommendation<Id> & { width: number; members: number };

// Groups count ages in whole years, so a child of 4.5 fits a 4–6 group.
export const fitsAge = (age: number, group: Pick<GroupCapacity<unknown>, "ageFrom" | "ageTo">): boolean => {
  const years = Math.floor(age);
  return (group.ageFrom === null || years >= group.ageFrom) && (group.ageTo === null || years <= group.ageTo);
};

const freeSpotsOf = (group: GroupCapacity<unknown>): number | null =>
  group.maxMembers === null ? null : Math.max(0, group.maxMembers - group.members - group.pending);

// A group without a limit always has room, more than any group with one.
const byFreeSpots = (a: GroupRecommendation<unknown>, b: GroupRecommendation<unknown>): number => {
  if (a.freeSpots === null || b.freeSpots === null) {
    return Number(a.freeSpots !== null) - Number(b.freeSpots !== null);
  }
  return b.freeSpots - a.freeSpots;
};

const byFit = (a: Candidate<unknown>, b: Candidate<unknown>): number =>
  Number(a.full) - Number(b.full) || a.width - b.width || byFreeSpots(a, b) || a.members - b.members;

// The groups that fit the age, best first: groups with room before full
// ones, then the narrowest age range, then most free spots, then fewest
// members. Full groups stay in the list because the limit is soft. Equal
// groups keep the order they were given in. Uses sort, not toSorted, so it
// also runs on Hermes.
export const recommendGroups = <Id>(age: number, groups: readonly GroupCapacity<Id>[]): GroupRecommendation<Id>[] =>
  groups
    .filter((group) => fitsAge(age, group))
    .map((group): Candidate<Id> => {
      const freeSpots = freeSpotsOf(group);
      return {
        groupId: group.id,
        freeSpots,
        full: freeSpots === 0,
        width: rangeWidth(group),
        members: group.members + group.pending,
      };
    })
    .sort(byFit)
    .map(({ groupId, freeSpots, full }) => ({ groupId, freeSpots, full }));
