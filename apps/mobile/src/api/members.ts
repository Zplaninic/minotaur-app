import type { CreateMemberBody } from "@repo/shared";
import {
  createMember,
  fetchMembersPage,
  keysToInvalidateAfterCreateMember,
  memberKeys,
  memberQueries,
  nextMembersPage,
} from "@repo/shared/client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// Pages are loaded one after another as the list scrolls.
export const useMemberPages = (pageSize: number) =>
  useInfiniteQuery({
    queryKey: memberKeys.pages(pageSize),
    queryFn: ({ pageParam }) => fetchMembersPage(api, { page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: nextMembersPage,
  });

// Every member of the club, for pickers.
export const useAllMembers = () => useQuery(memberQueries.everyone(api));

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
