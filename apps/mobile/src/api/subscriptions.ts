import type { Month, SubscriptionBody } from "@repo/shared";
import {
  createSubscription,
  keysToInvalidateAfterSubscriptionChange,
  subscriptionQueries,
  updateSubscription,
} from "@repo/shared/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useSubscriptions = () => useQuery(subscriptionQueries.list(api));

type QueryToggle = { enabled?: boolean };

export const useSubscriptionSummary = (month: Month, options: QueryToggle = {}) =>
  useQuery({ ...subscriptionQueries.summary(api, month), ...options });

export const useOverduePayments = (options: QueryToggle = {}) =>
  useQuery({ ...subscriptionQueries.overdue(api), ...options });

const useSubscriptionChange = (save: (body: SubscriptionBody) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: save,
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterSubscriptionChange.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};

export const useCreateSubscription = () => useSubscriptionChange((body) => createSubscription(api, body));

export const useUpdateSubscription = (subscriptionId: string) =>
  useSubscriptionChange((body) => updateSubscription(api, subscriptionId, body));
