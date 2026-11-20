import {
  auditEventKeys,
  auditEventQueries,
  fetchAuditEventsPage,
  nextAuditEventsCursor,
  type AuditEventFilters,
} from "@repo/shared/client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "./client";

export const useAuditEvents = (filters: AuditEventFilters) =>
  useInfiniteQuery({
    queryKey: auditEventKeys.pages(filters),
    queryFn: ({ pageParam }) => fetchAuditEventsPage(api, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextAuditEventsCursor,
  });

// The trainers and admins, to filter the log by who did it.
export const useAuditActors = () => useQuery(auditEventQueries.actors(api));
