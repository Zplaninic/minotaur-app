import {
  listSubscriptionsResponse,
  subscriptionResponse,
  type SubscriptionBody,
  type SubscriptionResponse,
} from "../types/subscription.js";
import type { ApiClient } from "./apiClient.js";

export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  list: () => [...subscriptionKeys.all, "list"] as const,
};

const subscriptionPath = (subscriptionId: string): string => `/subscriptions/${encodeURIComponent(subscriptionId)}`;

// Query options for TanStack Query: useQuery(subscriptionQueries.list(api)).
export const subscriptionQueries = {
  list: (api: ApiClient) => ({
    queryKey: subscriptionKeys.list(),
    queryFn: () => api.fetch("/subscriptions", listSubscriptionsResponse),
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

export const keysToInvalidateAfterSubscriptionChange = [subscriptionKeys.all] as const;
