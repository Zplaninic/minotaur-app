import type { CreateMemberBody } from "@repo/shared";
import {
  createMember,
  fetchMembersPage,
  keysToInvalidateAfterCreateMember,
  memberKeys,
  nextMembersPage,
} from "@repo/shared/client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// Pages are loaded one after another as the list scrolls.
export const useMemberPages = (pageSize: number) =>
  useInfiniteQuery({
    queryKey: memberKeys.pages(pageSize),
    queryFn: ({ pageParam }) => fetchMembersPage(api, { page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: nextMembersPage,
  });

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
