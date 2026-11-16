import { weekday, type GroupResponse, type Weekday } from "../types/group.js";
import { dashboardResponse } from "../types/dashboard.js";
import type { ApiClient } from "./apiClient.js";

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

// Query options for TanStack Query: useQuery(dashboardQueries.summary(api)).
export const dashboardQueries = {
  summary: (api: ApiClient) => ({
    queryKey: dashboardKeys.all,
    queryFn: () => api.fetch("/dashboard", dashboardResponse),
  }),
};

// The weekday of a YYYY-MM-DD date. weekday lists Monday first; getUTCDay counts from Sunday.
export const weekdayOfDate = (isoDate: string): Weekday => {
  const day = weekday.options[(new Date(`${isoDate}T00:00:00.000Z`).getUTCDay() + 6) % 7];
  // The index is always 0..6.
  return day ?? "monday";
};

// The groups that train on a date: the owner's own first, then by start time.
export const groupsTrainingOn = (
  groups: readonly GroupResponse[],
  isoDate: string,
  ownerId: string | undefined,
): GroupResponse[] => {
  const day = weekdayOfDate(isoDate);
  const isMine = (group: GroupResponse): number => (group.owner.id === ownerId ? 0 : 1);
  return groups
    .filter((group) => group.days.includes(day))
    .toSorted((a, b) => isMine(a) - isMine(b) || a.from.localeCompare(b.from));
};

// The share of expected attendance that was marked, 0..1; undefined when nothing was expected.
export const attendanceRate = (attendance: { expected: number; attended: number }): number | undefined =>
  attendance.expected === 0 ? undefined : Math.min(attendance.attended / attendance.expected, 1);
