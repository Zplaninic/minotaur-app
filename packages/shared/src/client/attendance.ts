import { z } from "zod";
import {
  FIRST_MONTH,
  groupAttendanceResponse,
  trainingSessionResponse,
  type GroupAttendanceResponse,
  type Month,
  type TrainingSessionResponse,
} from "../types/attendance.js";
import type { ApiClient } from "./apiClient.js";

export const attendanceKeys = {
  all: ["attendance"] as const,
  month: (groupId: string, month: Month) => [...attendanceKeys.all, groupId, month] as const,
};

const sessionsPath = (groupId: string): string => `/groups/${encodeURIComponent(groupId)}/sessions`;
const sessionPath = (groupId: string, sessionId: string): string =>
  `${sessionsPath(groupId)}/${encodeURIComponent(sessionId)}`;
const attendancePath = (groupId: string, sessionId: string, memberId: string): string =>
  `${sessionPath(groupId, sessionId)}/attendance/${encodeURIComponent(memberId)}`;

const jsonPost = (body: object): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Query options for TanStack Query: useQuery(attendanceQueries.month(api, groupId, month)).
export const attendanceQueries = {
  month: (api: ApiClient, groupId: string, month: Month) => ({
    queryKey: attendanceKeys.month(groupId, month),
    queryFn: () =>
      api.fetch(
        `/groups/${encodeURIComponent(groupId)}/attendance?month=${encodeURIComponent(month)}`,
        groupAttendanceResponse,
      ),
  }),
};

// The server answers 204 with no body.
export const createMonthSessions = (api: ApiClient, groupId: string, month: Month): Promise<undefined> =>
  api.fetch(`${sessionsPath(groupId)}/month`, z.undefined(), jsonPost({ month }));

export const addTrainingSession = (api: ApiClient, groupId: string, date: string): Promise<TrainingSessionResponse> =>
  api.fetch(sessionsPath(groupId), trainingSessionResponse, jsonPost({ date }));

// The server answers 204 with no body.
export const deleteTrainingSession = (api: ApiClient, groupId: string, sessionId: string): Promise<undefined> =>
  api.fetch(sessionPath(groupId, sessionId), z.undefined(), { method: "DELETE" });

// The server answers 204 with no body.
export const markAttendance = (api: ApiClient, groupId: string, sessionId: string, memberId: string) =>
  api.fetch(attendancePath(groupId, sessionId, memberId), z.undefined(), { method: "PUT" });

// The server answers 204 with no body.
export const unmarkAttendance = (api: ApiClient, groupId: string, sessionId: string, memberId: string) =>
  api.fetch(attendancePath(groupId, sessionId, memberId), z.undefined(), { method: "DELETE" });

const monthMemberPath = (groupId: string, month: Month, memberId: string): string =>
  `/groups/${encodeURIComponent(groupId)}/months/${encodeURIComponent(month)}/members/${encodeURIComponent(memberId)}`;

// The server answers 204 with no body.
export const addMonthMember = (api: ApiClient, groupId: string, month: Month, memberId: string) =>
  api.fetch(monthMemberPath(groupId, month, memberId), z.undefined(), { method: "PUT" });

// The server answers 204 with no body.
export const removeMonthMember = (api: ApiClient, groupId: string, month: Month, memberId: string) =>
  api.fetch(monthMemberPath(groupId, month, memberId), z.undefined(), { method: "DELETE" });

// The server answers 204 with no body. null clears the subscription.
export const setMonthSubscription = (
  api: ApiClient,
  groupId: string,
  month: Month,
  memberId: string,
  subscriptionId: string | null,
) =>
  api.fetch(`${monthMemberPath(groupId, month, memberId)}/subscription`, z.undefined(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });

// The server answers 204 with no body.
export const setMonthPaid = (api: ApiClient, groupId: string, month: Month, memberId: string, paid: boolean) =>
  api.fetch(`${monthMemberPath(groupId, month, memberId)}/paid`, z.undefined(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paid }),
  });

// The group's members who are not on the month's roster yet.
export const monthRosterCandidates = <Member extends { id: string }>(
  groupMembers: readonly Member[],
  roster: readonly { id: string }[],
): Member[] => {
  const onRoster = new Set(roster.map((member) => member.id));
  return groupMembers.filter((member) => !onRoster.has(member.id));
};

// Only members without ticks in the month can be removed from its roster.
export const memberHasAttendance = (member: { attendedSessionIds: readonly string[] }): boolean =>
  member.attendedSessionIds.length > 0;

export const keysToInvalidateAfterAttendanceChange = [attendanceKeys.all] as const;

// The local month of a Date, as YYYY-MM.
export const toMonth = (date: Date): Month =>
  `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const shiftMonth = (value: Month, by: number): Month => {
  const [year = 0, monthNumber = 1] = value.split("-").map(Number);
  return toMonth(new Date(year, monthNumber - 1 + by, 1));
};

// The first day of a month, as YYYY-MM-DD; with the format helpers it names the month.
export const firstDayOfMonth = (value: Month): string => `${value}-01`;

// Sessions can be created only for the current or the next month. The
// backend repeats this check on the gym's date and has the final say.
export const canCreateSessionsIn = (month: Month, todayIsoDate: string): boolean => {
  const current = todayIsoDate.slice(0, 7);
  return month === current || month === shiftMonth(current, 1);
};

// The first and last date a new session can have, for date inputs.
export const sessionDateRange = (todayIsoDate: string): { min: string; max: string } => {
  const current = todayIsoDate.slice(0, 7);
  const afterNext = shiftMonth(current, 2);
  const [year = 0, monthNumber = 1] = afterNext.split("-").map(Number);
  // Day 0 of the month after next is the last day of the next month.
  const last = new Date(Date.UTC(year, monthNumber - 1, 0)).toISOString().slice(0, 10);
  return { min: `${current}-01`, max: last };
};

// ISO dates sort like the days they stand for.
export const isFutureDate = (isoDate: string, todayIsoDate: string): boolean => isoDate > todayIsoDate;

// Which session of a month a one-session view shows.
export type SessionPick =
  | { kind: "latest" }
  | { kind: "first" }
  | { kind: "last" }
  | { kind: "id"; id: string };

// "latest" is the last session that is not in the future, else the first.
// An id that is gone (e.g. deleted) falls back to "latest".
export const resolveSession = (
  sessions: readonly TrainingSessionResponse[],
  pick: SessionPick,
  todayIsoDate: string,
): TrainingSessionResponse | undefined => {
  switch (pick.kind) {
    case "first":
      return sessions[0];
    case "last":
      return sessions.at(-1);
    case "id": {
      const found = sessions.find((session) => session.id === pick.id);
      if (found) {
        return found;
      }
      break;
    }
    case "latest":
      break;
  }
  return sessions.findLast((session) => !isFutureDate(session.date, todayIsoDate)) ?? sessions[0];
};

// Months before FIRST_MONTH do not exist, so there is no going back past it.
export const hasPreviousMonth = (value: Month): boolean => value > FIRST_MONTH;

export type SessionPosition = { month: Month; pick: SessionPick };

// Whether ‹ leads anywhere: an earlier session this month, or an earlier month.
export const hasPreviousSession = (
  sessions: readonly TrainingSessionResponse[],
  currentMonth: Month,
  currentId: string | undefined,
): boolean => sessions.findIndex((session) => session.id === currentId) > 0 || hasPreviousMonth(currentMonth);

// The previous (-1) or next (+1) session. Past either end of the month it
// moves to the last or first session of the neighbouring month.
export const stepSession = (
  sessions: readonly TrainingSessionResponse[],
  currentMonth: Month,
  currentId: string | undefined,
  direction: -1 | 1,
): SessionPosition => {
  const index = sessions.findIndex((session) => session.id === currentId);
  const next = index === -1 ? undefined : sessions[index + direction];
  if (next) {
    return { month: currentMonth, pick: { kind: "id", id: next.id } };
  }
  return { month: shiftMonth(currentMonth, direction), pick: { kind: direction === -1 ? "last" : "first" } };
};

// The month with one member ticked or unticked, for optimistic updates.
export const applyAttendanceChange = (
  data: GroupAttendanceResponse,
  change: { sessionId: string; memberId: string; attended: boolean },
): GroupAttendanceResponse => ({
  ...data,
  members: data.members.map((member) => {
    if (member.id !== change.memberId) {
      return member;
    }
    const others = member.attendedSessionIds.filter((id) => id !== change.sessionId);
    return { ...member, attendedSessionIds: change.attended ? [...others, change.sessionId] : others };
  }),
});

// Only sessions nobody attended can be deleted.
export const sessionHasAttendance = (data: GroupAttendanceResponse, sessionId: string): boolean =>
  data.members.some((member) => member.attendedSessionIds.includes(sessionId));
