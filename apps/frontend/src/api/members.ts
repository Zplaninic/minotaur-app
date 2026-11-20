import type { CreateMemberBody, ImportMembersBody, UpdateMemberBody } from "@repo/shared";
import {
  archiveMember,
  createMember,
  importMembers,
  keysToInvalidateAfterArchiveMember,
  keysToInvalidateAfterCreateMember,
  keysToInvalidateAfterImportMembers,
  keysToInvalidateAfterUpdateMember,
  memberQueries,
  updateMember,
  type MembersPageQuery,
} from "@repo/shared/client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useMembers = (query: MembersPageQuery) =>
  useQuery({ ...memberQueries.list(api, query), placeholderData: keepPreviousData });

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

export const useArchiveMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => archiveMember(api, memberId),
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterArchiveMember.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};

// A dry run only checks the rows, so nothing goes stale.
export const useImportMembers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ImportMembersBody) => importMembers(api, body),
    onSuccess: async (result) => {
      if (!result.imported) {
        return;
      }
      await Promise.all(
        keysToInvalidateAfterImportMembers.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};
