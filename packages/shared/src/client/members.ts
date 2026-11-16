import { z } from "zod";
import { MAX_PAGE_SIZE, type PaginationQuery } from "../types/common.js";
import {
  listMembersResponse,
  memberResponse,
  type CreateMemberBody,
  type ListMembersResponse,
  type MemberResponse,
  type UpdateMemberBody,
} from "../types/member.js";
import { GROUP_OWNER_ROLE } from "../types/group.js";
import type { ApiClient } from "./apiClient.js";
import { attendanceKeys } from "./attendance.js";
import { groupKeys } from "./groups.js";
import { guardianKeys } from "./guardians.js";

export const memberKeys = {
  all: ["members"] as const,
  list: (query: MembersPageQuery) => [...memberKeys.all, "list", query] as const,
  pages: (pageSize: number, unpaid = false) => [...memberKeys.all, "pages", pageSize, unpaid] as const,
  trainers: () => [...memberKeys.all, "trainers"] as const,
  everyone: () => [...memberKeys.all, "everyone"] as const,
  detail: (memberId: string) => [...memberKeys.all, "detail", memberId] as const,
};

// unpaid: only members with an unpaid past month.
export type MembersPageQuery = PaginationQuery & { unpaid?: boolean };

export const fetchMembersPage = (api: ApiClient, query: MembersPageQuery): Promise<ListMembersResponse> =>
  api.fetch(
    `/members?page=${query.page}&pageSize=${query.pageSize}${query.unpaid ? "&unpaid=true" : ""}`,
    listMembersResponse,
  );

// The page after `last`, or undefined when `last` was the final page.
export const nextMembersPage = (last: ListMembersResponse): number | undefined =>
  last.page * last.pageSize < last.total ? last.page + 1 : undefined;

// Every member, fetched page by page. For pickers that need the whole club.
export const fetchAllMembers = async (api: ApiClient): Promise<MemberResponse[]> => {
  const members: MemberResponse[] = [];
  let page: number | undefined = 1;
  while (page !== undefined) {
    const result = await fetchMembersPage(api, { page, pageSize: MAX_PAGE_SIZE });
    members.push(...result.items);
    page = nextMembersPage(result);
  }
  return members;
};

// Query options for TanStack Query: useQuery(memberQueries.list(api, query)).
export const memberQueries = {
  list: (api: ApiClient, query: MembersPageQuery) => ({
    queryKey: memberKeys.list(query),
    queryFn: () => fetchMembersPage(api, query),
  }),
  detail: (api: ApiClient, memberId: string) => ({
    queryKey: memberKeys.detail(memberId),
    queryFn: () => api.fetch(`/members/${encodeURIComponent(memberId)}`, memberResponse),
  }),
  everyone: (api: ApiClient) => ({
    queryKey: memberKeys.everyone(),
    queryFn: () => fetchAllMembers(api),
  }),
  // The members who can own a group. One page: a club has few trainers.
  trainers: (api: ApiClient) => ({
    queryKey: memberKeys.trainers(),
    queryFn: () => api.fetch(`/members?role=${GROUP_OWNER_ROLE}&page=1&pageSize=${MAX_PAGE_SIZE}`, listMembersResponse),
  }),
};

export const createMember = (api: ApiClient, body: CreateMemberBody): Promise<MemberResponse> =>
  api.fetch("/members", memberResponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// A new member can bring new guardians with it, so both lists go stale.
export const keysToInvalidateAfterCreateMember = [memberKeys.all, guardianKeys.all] as const;

export const updateMember = (api: ApiClient, memberId: string, body: UpdateMemberBody): Promise<MemberResponse> =>
  api.fetch(`/members/${encodeURIComponent(memberId)}`, memberResponse, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// The member's name and details also show in groups and attendance, and the
// edit can add new guardians.
export const keysToInvalidateAfterUpdateMember = [
  memberKeys.all,
  guardianKeys.all,
  groupKeys.all,
  attendanceKeys.all,
] as const;

// The server answers 204 with no body.
export const archiveMember = (api: ApiClient, memberId: string): Promise<undefined> =>
  api.fetch(`/members/${encodeURIComponent(memberId)}`, z.undefined(), { method: "DELETE" });

// An archived member leaves every list, their groups, and the future month rosters.
export const keysToInvalidateAfterArchiveMember = [memberKeys.all, groupKeys.all, attendanceKeys.all] as const;
