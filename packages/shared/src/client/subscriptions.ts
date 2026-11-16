import type { Month } from "../types/attendance.js";
import { overduePaymentsResponse, subscriptionSummaryResponse } from "../types/payment.js";
import {
  listSubscriptionsResponse,
  subscriptionResponse,
  type SubscriptionBody,
  type SubscriptionResponse,
} from "../types/subscription.js";
import type { ApiClient } from "./apiClient.js";
import { attendanceKeys } from "./attendance.js";
import { memberKeys } from "./members.js";

export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  list: () => [...subscriptionKeys.all, "list"] as const,
  summary: (month: Month) => [...subscriptionKeys.all, "summary", month] as const,
  overdue: () => [...subscriptionKeys.all, "overdue"] as const,
};

const subscriptionPath = (subscriptionId: string): string => `/subscriptions/${encodeURIComponent(subscriptionId)}`;

// Query options for TanStack Query: useQuery(subscriptionQueries.list(api)).
export const subscriptionQueries = {
  list: (api: ApiClient) => ({
    queryKey: subscriptionKeys.list(),
    queryFn: () => api.fetch("/subscriptions", listSubscriptionsResponse),
  }),
  summary: (api: ApiClient, month: Month) => ({
    queryKey: subscriptionKeys.summary(month),
    queryFn: () => api.fetch(`/subscriptions/summary?month=${encodeURIComponent(month)}`, subscriptionSummaryResponse),
  }),
  overdue: (api: ApiClient) => ({
    queryKey: subscriptionKeys.overdue(),
    queryFn: () => api.fetch("/subscriptions/overdue", overduePaymentsResponse),
  }),
};

const jsonRequest = (method: "POST" | "PUT", body: SubscriptionBody): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const createSubscription = (api: ApiClient, body: SubscriptionBody): Promise<SubscriptionResponse> =>
  api.fetch("/subscriptions", subscriptionResponse, jsonRequest("POST", body));

export const updateSubscription = (
  api: ApiClient,
  subscriptionId: string,
  body: SubscriptionBody,
): Promise<SubscriptionResponse> =>
  api.fetch(subscriptionPath(subscriptionId), subscriptionResponse, jsonRequest("PUT", body));

// A new name shows on the attendance sheets too.
export const keysToInvalidateAfterSubscriptionChange = [subscriptionKeys.all, attendanceKeys.all] as const;

// A member's subscription or Paid for a month: the sheets, the summary, the
// overdue list and the members filtered by unpaid months.
export const keysToInvalidateAfterMonthPaymentChange = [
  attendanceKeys.all,
  subscriptionKeys.all,
  memberKeys.all,
] as const;

// One member's unpaid past months, oldest first; none when they owe nothing.
export const overdueMonthsOf = (
  overdue: { items: readonly { id: string; months: readonly { month: Month }[] }[] } | undefined,
  memberId: string,
): Month[] => overdue?.items.find((item) => item.id === memberId)?.months.map((entry) => entry.month) ?? [];
