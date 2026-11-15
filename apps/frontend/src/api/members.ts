import type { CreateMemberBody, PaginationQuery } from "@repo/shared";
import { createMember, keysToInvalidateAfterCreateMember, memberQueries } from "@repo/shared/client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useMembers = (query: PaginationQuery) =>
  useQuery({ ...memberQueries.list(api, query), placeholderData: keepPreviousData });

// The members who can own a group.
export const useTrainers = () => useQuery(memberQueries.trainers(api));

export const useCreateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMemberBody) => createMember(api, body),
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterCreateMember.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};
