import type { SubscriptionBody } from "@repo/shared";
import {
  createSubscription,
  keysToInvalidateAfterSubscriptionChange,
  subscriptionQueries,
  updateSubscription,
} from "@repo/shared/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useSubscriptions = () => useQuery(subscriptionQueries.list(api));

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
