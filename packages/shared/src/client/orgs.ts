import { listOrgsResponse } from "../types/org.js";
import type { ApiClient } from "./apiClient.js";

export const orgKeys = {
  all: ["orgs"] as const,
  list: () => [...orgKeys.all, "list"] as const,
};

// Query options for TanStack Query: useQuery(orgQueries.list(api)).
export const orgQueries = {
  list: (api: ApiClient) => ({
    queryKey: orgKeys.list(),
    queryFn: () => api.fetch("/orgs", listOrgsResponse),
  }),
};
