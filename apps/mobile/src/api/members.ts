import type { CreateMemberBody, UpdateMemberBody } from "@repo/shared";
import {
  archiveMember,
  createMember,
  fetchMembersPage,
  keysToInvalidateAfterArchiveMember,
  keysToInvalidateAfterCreateMember,
  keysToInvalidateAfterSetMemberNew,
  keysToInvalidateAfterUpdateMember,
  memberKeys,
  memberQueries,
  nextMembersPage,
  setMemberNew,
  updateMember,
} from "@repo/shared/client";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// Pages are loaded one after another as the list scrolls. unpaid: only
// members with an unpaid past month. search: words to find in the name,
// surname or email. While a new filter loads, the previous list stays.
export const useMemberPages = (pageSize: number, unpaid = false, search = "") =>
  useInfiniteQuery({
    queryKey: memberKeys.pages(pageSize, unpaid, search),
    queryFn: ({ pageParam }) => fetchMembersPage(api, { page: pageParam, pageSize, unpaid, search }),
    initialPageParam: 1,
    getNextPageParam: nextMembersPage,
    placeholderData: keepPreviousData,
  });

// Not kept after the edit form closes: the form starts from what it is given,
// so it must be the member as it is now, not a copy from an earlier visit.
export const useMember = (memberId: string) => useQuery({ ...memberQueries.detail(api, memberId), gcTime: 0 });

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

// The screen showing the member is left right after, so its query is not
// refetched: that would answer NOT_FOUND on the way out.
export const useArchiveMember = (memberId: string) => {
  const queryClient = useQueryClient();
  const leaving = JSON.stringify(memberKeys.detail(memberId));
  return useMutation({
    mutationFn: () => archiveMember(api, memberId),
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterArchiveMember.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, predicate: (query) => JSON.stringify(query.queryKey) !== leaving }),
        ),
      );
    },
  });
};

export const useSetMemberNew = (memberId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isNew: boolean) => setMemberNew(api, memberId, isNew),
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterSetMemberNew.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};
