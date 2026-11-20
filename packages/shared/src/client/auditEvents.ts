import { listAuditEventsResponse, type AuditAction, type ListAuditEventsResponse } from "../types/auditEvent.js";
import { MAX_PAGE_SIZE } from "../types/common.js";
import { listMembersResponse, type MemberResponse } from "../types/member.js";
import type { ApiClient } from "./apiClient.js";

// What the activity log is narrowed to. from and to are ISO datetimes.
export type AuditEventFilters = {
  actorId?: string;
  memberId?: string;
  groupId?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
};

// Calendar days (YYYY-MM-DD, both included) in the viewer's time zone, as
// the from and to datetimes of the filter. to is the start of the next day.
export const dayRangeFilter = (fromDay: string, toDay: string): Pick<AuditEventFilters, "from" | "to"> => {
  const startOf = (day: string, addDays = 0): string => {
    const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
    return new Date(year, month - 1, date + addDays).toISOString();
  };
  return {
    ...(fromDay ? { from: startOf(fromDay) } : {}),
    ...(toDay ? { to: startOf(toDay, 1) } : {}),
  };
};

export const auditEventKeys = {
  all: ["auditEvents"] as const,
  pages: (filters: AuditEventFilters) => [...auditEventKeys.all, "pages", filters] as const,
  actors: () => [...auditEventKeys.all, "actors"] as const,
};

export const auditEventsPath = (filters: AuditEventFilters, before?: string): string => {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries({ ...filters, before })) {
    if (value) {
      params.set(name, value);
    }
  }
  const query = params.toString();
  return query ? `/audit-events?${query}` : "/audit-events";
};

export const fetchAuditEventsPage = (
  api: ApiClient,
  filters: AuditEventFilters,
  before?: string,
): Promise<ListAuditEventsResponse> => api.fetch(auditEventsPath(filters, before), listAuditEventsResponse);

// For TanStack Query's getNextPageParam: undefined after the last page.
export const nextAuditEventsCursor = (last: ListAuditEventsResponse): string | undefined =>
  last.nextCursor ?? undefined;

// The members who can act in the system: everyone with a login role. One page
// per role: a club has few trainers and admins.
export const fetchAuditActors = async (api: ApiClient): Promise<MemberResponse[]> => {
  const pages = await Promise.all(
    (["admin", "trainer"] as const).map((role) =>
      api.fetch(`/members?role=${role}&page=1&pageSize=${MAX_PAGE_SIZE}`, listMembersResponse),
    ),
  );
  return pages
    .flatMap((page) => page.items)
    .toSorted((a, b) => a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name));
};

export const auditEventQueries = {
  actors: (api: ApiClient) => ({
    queryKey: auditEventKeys.actors(),
    queryFn: () => fetchAuditActors(api),
  }),
};
