import type { CreateGroupBody } from "@repo/shared";
import { createGroup, groupQueries, keysToInvalidateAfterCreateGroup } from "@repo/shared/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useGroups = () => useQuery(groupQueries.list(api));

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupBody) => createGroup(api, body),
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterCreateGroup.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};
