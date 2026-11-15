import { MAX_PAGE_SIZE, type PaginationQuery } from "../types/common.js";
import {
  listMembersResponse,
  memberResponse,
  type CreateMemberBody,
  type ListMembersResponse,
  type MemberResponse,
} from "../types/member.js";
import { GROUP_OWNER_ROLE } from "../types/group.js";
import type { ApiClient } from "./apiClient.js";
import { guardianKeys } from "./guardians.js";

export const memberKeys = {
  all: ["members"] as const,
  list: (query: PaginationQuery) => [...memberKeys.all, "list", query] as const,
  pages: (pageSize: number) => [...memberKeys.all, "pages", pageSize] as const,
  trainers: () => [...memberKeys.all, "trainers"] as const,
};

export const fetchMembersPage = (api: ApiClient, query: PaginationQuery): Promise<ListMembersResponse> =>
  api.fetch(`/members?page=${query.page}&pageSize=${query.pageSize}`, listMembersResponse);

// The page after `last`, or undefined when `last` was the final page.
export const nextMembersPage = (last: ListMembersResponse): number | undefined =>
  last.page * last.pageSize < last.total ? last.page + 1 : undefined;

// Query options for TanStack Query: useQuery(memberQueries.list(api, query)).
export const memberQueries = {
  list: (api: ApiClient, query: PaginationQuery) => ({
    queryKey: memberKeys.list(query),
    queryFn: () => fetchMembersPage(api, query),
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
