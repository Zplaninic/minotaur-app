import type { CreateMemberBody, UpdateMemberBody } from "@repo/shared";
import {
  createMember,
  fetchMembersPage,
  keysToInvalidateAfterCreateMember,
  keysToInvalidateAfterUpdateMember,
  memberKeys,
  memberQueries,
  nextMembersPage,
  updateMember,
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

export const useMember = (memberId: string) => useQuery(memberQueries.detail(api, memberId));

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

export const useUpdateMember = (memberId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMemberBody) => updateMember(api, memberId, body),
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterUpdateMember.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};
