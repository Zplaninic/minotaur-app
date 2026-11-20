import { z } from "zod";
import {
  enrollmentRequestResponse,
  listEnrollmentRequestsResponse,
  type AcceptEnrollmentChildBody,
  type CreateEnrollmentRequestBody,
  type EnrollmentRequestResponse,
  type EnrollmentRequestState,
  type ListEnrollmentRequestsResponse,
} from "../types/enrollmentRequest.js";
import type { ApiClient } from "./apiClient.js";
import { attendanceKeys } from "./attendance.js";
import { groupKeys } from "./groups.js";
import { guardianKeys } from "./guardians.js";
import { memberKeys } from "./members.js";

export type EnrollmentRequestsPageQuery = { state: EnrollmentRequestState; page: number; pageSize: number };

export const enrollmentRequestKeys = {
  all: ["enrollmentRequests"] as const,
  list: (query: EnrollmentRequestsPageQuery) => [...enrollmentRequestKeys.all, "list", query] as const,
};

const requestPath = (requestId: string): string => `/enrollment-requests/${encodeURIComponent(requestId)}`;
const childPath = (requestId: string, childId: string): string =>
  `${requestPath(requestId)}/children/${encodeURIComponent(childId)}`;

const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const fetchEnrollmentRequestsPage = (
  api: ApiClient,
  query: EnrollmentRequestsPageQuery,
): Promise<ListEnrollmentRequestsResponse> => {
  const params = new URLSearchParams({
    state: query.state,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  return api.fetch(`/enrollment-requests?${params.toString()}`, listEnrollmentRequestsResponse);
};

// Query options for TanStack Query: useQuery(enrollmentRequestQueries.list(api, query)).
export const enrollmentRequestQueries = {
  list: (api: ApiClient, query: EnrollmentRequestsPageQuery) => ({
    queryKey: enrollmentRequestKeys.list(query),
    queryFn: () => fetchEnrollmentRequestsPage(api, query),
  }),
};

export const createEnrollmentRequest = (
  api: ApiClient,
  body: CreateEnrollmentRequestBody,
): Promise<EnrollmentRequestResponse> =>
  api.fetch("/enrollment-requests", enrollmentRequestResponse, jsonBody("POST", body));

export const setEnrollmentChildGroup = (
  api: ApiClient,
  requestId: string,
  childId: string,
  groupId: string | null,
): Promise<EnrollmentRequestResponse> =>
  api.fetch(`${childPath(requestId, childId)}/group`, enrollmentRequestResponse, jsonBody("PUT", { groupId }));

export const acceptEnrollmentChild = (
  api: ApiClient,
  requestId: string,
  childId: string,
  body: AcceptEnrollmentChildBody,
): Promise<EnrollmentRequestResponse> =>
  api.fetch(`${childPath(requestId, childId)}/accept`, enrollmentRequestResponse, jsonBody("POST", body));

export const rejectEnrollmentChild = (
  api: ApiClient,
  requestId: string,
  childId: string,
): Promise<EnrollmentRequestResponse> =>
  api.fetch(`${childPath(requestId, childId)}/reject`, enrollmentRequestResponse, { method: "POST" });

// Puts a rejected child back to waiting.
export const reopenEnrollmentChild = (
  api: ApiClient,
  requestId: string,
  childId: string,
): Promise<EnrollmentRequestResponse> =>
  api.fetch(`${childPath(requestId, childId)}/reopen`, enrollmentRequestResponse, { method: "POST" });

// The server answers 204 with no body.
export const deleteEnrollmentRequest = (api: ApiClient, requestId: string): Promise<undefined> =>
  api.fetch(requestPath(requestId), z.undefined(), { method: "DELETE" });

// Creating, regrouping, rejecting and deleting change only the requests.
export const keysToInvalidateAfterEnrollmentChange = [enrollmentRequestKeys.all] as const;

// Accepting also creates a member and a guardian and adds the member to a
// group and its month rosters.
export const keysToInvalidateAfterEnrollmentAccept = [
  enrollmentRequestKeys.all,
  memberKeys.all,
  guardianKeys.all,
  groupKeys.all,
  attendanceKeys.all,
] as const;
