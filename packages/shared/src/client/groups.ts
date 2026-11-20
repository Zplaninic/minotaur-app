import { z } from "zod";
import {
  groupResponse,
  isGroupMemberRole,
  listGroupMembersResponse,
  listGroupsResponse,
  type CreateGroupBody,
  type GroupMemberResponse,
  type GroupResponse,
  type UpdateGroupBody,
} from "../types/group.js";
import type { MemberResponse } from "../types/member.js";
import type { ApiClient } from "./apiClient.js";
import { attendanceKeys } from "./attendance.js";

export const groupKeys = {
  all: ["groups"] as const,
  list: () => [...groupKeys.all, "list"] as const,
  detail: (groupId: string) => [...groupKeys.all, "detail", groupId] as const,
  members: (groupId: string) => [...groupKeys.all, "members", groupId] as const,
};

const groupPath = (groupId: string): string => `/groups/${encodeURIComponent(groupId)}`;
const groupMemberPath = (groupId: string, memberId: string): string =>
  `${groupPath(groupId)}/members/${encodeURIComponent(memberId)}`;

// Query options for TanStack Query: useQuery(groupQueries.list(api)).
export const groupQueries = {
  list: (api: ApiClient) => ({
    queryKey: groupKeys.list(),
    queryFn: () => api.fetch("/groups", listGroupsResponse),
  }),
  detail: (api: ApiClient, groupId: string) => ({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => api.fetch(groupPath(groupId), groupResponse),
  }),
  members: (api: ApiClient, groupId: string) => ({
    queryKey: groupKeys.members(groupId),
    queryFn: () => api.fetch(`${groupPath(groupId)}/members`, listGroupMembersResponse),
  }),
};

export const createGroup = (api: ApiClient, body: CreateGroupBody): Promise<GroupResponse> =>
  api.fetch("/groups", groupResponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const keysToInvalidateAfterCreateGroup = [groupKeys.all] as const;

export const updateGroup = (api: ApiClient, groupId: string, body: UpdateGroupBody): Promise<GroupResponse> =>
  api.fetch(groupPath(groupId), groupResponse, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const keysToInvalidateAfterUpdateGroup = [groupKeys.all] as const;

// The server answers 204 with no body.
export const archiveGroup = (api: ApiClient, groupId: string): Promise<undefined> =>
  api.fetch(groupPath(groupId), z.undefined(), { method: "DELETE" });

export const keysToInvalidateAfterArchiveGroup = [groupKeys.all, attendanceKeys.all] as const;

// The server answers 204 with no body.
export const addGroupMember = (api: ApiClient, groupId: string, memberId: string): Promise<undefined> =>
  api.fetch(groupMemberPath(groupId, memberId), z.undefined(), { method: "PUT" });

// The server answers 204 with no body.
export const removeGroupMember = (api: ApiClient, groupId: string, memberId: string): Promise<undefined> =>
  api.fetch(groupMemberPath(groupId, memberId), z.undefined(), { method: "DELETE" });

// The member list, the member count on the group and in the groups list, and
// the month rosters, which follow the group's members.
export const keysToInvalidateAfterGroupMemberChange = [groupKeys.all, attendanceKeys.all] as const;

// The members who can still be added to a group: the right role, not yet in it.
export const groupMemberCandidates = (
  members: readonly MemberResponse[],
  current: readonly Pick<GroupMemberResponse, "id">[],
): MemberResponse[] => {
  const currentIds = new Set(current.map((member) => member.id));
  return members.filter((member) => isGroupMemberRole(member.role) && !currentIds.has(member.id));
};

// Which wording a group's age range takes, or null when it has none.
export type GroupAgeRangeKind = "range" | "from" | "to";

export const groupAgeRangeKind = (group: Pick<GroupResponse, "ageFrom" | "ageTo">): GroupAgeRangeKind | null => {
  if (group.ageFrom !== null && group.ageTo !== null) {
    return "range";
  }
  if (group.ageFrom !== null) {
    return "from";
  }
  return group.ageTo === null ? null : "to";
};

// Whether a group has more members than its limit. The limit is soft, so the
// apps warn instead of blocking.
export const isGroupOverLimit = (group: Pick<GroupResponse, "maxMembers" | "memberCount">): boolean =>
  group.maxMembers !== null && group.memberCount > group.maxMembers;
