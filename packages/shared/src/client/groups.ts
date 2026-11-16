import { z } from "zod";
import {
  groupResponse,
  isGroupMemberRole,
  listGroupMembersResponse,
  listGroupsResponse,
  type CreateGroupBody,
  type GroupMemberResponse,
  type GroupResponse,
} from "../types/group.js";
import type { MemberResponse } from "../types/member.js";
import type { ApiClient } from "./apiClient.js";

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

// The server answers 204 with no body.
export const addGroupMember = (api: ApiClient, groupId: string, memberId: string): Promise<undefined> =>
  api.fetch(groupMemberPath(groupId, memberId), z.undefined(), { method: "PUT" });

// The server answers 204 with no body.
export const removeGroupMember = (api: ApiClient, groupId: string, memberId: string): Promise<undefined> =>
  api.fetch(groupMemberPath(groupId, memberId), z.undefined(), { method: "DELETE" });

// The member list, and the member count on the group and in the groups list.
export const keysToInvalidateAfterGroupMemberChange = [groupKeys.all] as const;

// The members who can still be added to a group: the right role, not yet in it.
export const groupMemberCandidates = (
  members: readonly MemberResponse[],
  current: readonly GroupMemberResponse[],
): MemberResponse[] => {
  const currentIds = new Set(current.map((member) => member.id));
  return members.filter((member) => isGroupMemberRole(member.role) && !currentIds.has(member.id));
};
