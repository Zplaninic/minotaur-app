import { listGuardiansResponse } from "../types/guardian.js";
import type { ApiClient } from "./apiClient.js";

export const guardianKeys = {
  all: ["guardians"] as const,
  list: () => [...guardianKeys.all, "list"] as const,
};

// Query options for TanStack Query: useQuery(guardianQueries.list(api)).
export const guardianQueries = {
  list: (api: ApiClient) => ({
    queryKey: guardianKeys.list(),
    queryFn: () => api.fetch("/guardians", listGuardiansResponse),
  }),
};
