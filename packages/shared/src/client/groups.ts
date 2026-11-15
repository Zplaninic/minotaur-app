import { groupResponse, listGroupsResponse, type CreateGroupBody, type GroupResponse } from "../types/group.js";
import type { ApiClient } from "./apiClient.js";

export const groupKeys = {
  all: ["groups"] as const,
  list: () => [...groupKeys.all, "list"] as const,
};

// Query options for TanStack Query: useQuery(groupQueries.list(api)).
export const groupQueries = {
  list: (api: ApiClient) => ({
    queryKey: groupKeys.list(),
    queryFn: () => api.fetch("/groups", listGroupsResponse),
  }),
};

export const createGroup = (api: ApiClient, body: CreateGroupBody): Promise<GroupResponse> =>
  api.fetch("/groups", groupResponse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const keysToInvalidateAfterCreateGroup = [groupKeys.all] as const;
