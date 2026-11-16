import type { CreateGroupBody } from "@repo/shared";
import {
  addGroupMember,
  createGroup,
  groupQueries,
  keysToInvalidateAfterCreateGroup,
  keysToInvalidateAfterGroupMemberChange,
  removeGroupMember,
} from "@repo/shared/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useGroups = () => useQuery(groupQueries.list(api));

export const useGroup = (groupId: string) => useQuery(groupQueries.detail(api, groupId));

export const useGroupMembers = (groupId: string) => useQuery(groupQueries.members(api, groupId));

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

const useGroupMemberChange = (change: (memberId: string) => Promise<undefined>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: change,
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterGroupMemberChange.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
};

export const useAddGroupMember = (groupId: string) =>
  useGroupMemberChange((memberId) => addGroupMember(api, groupId, memberId));

export const useRemoveGroupMember = (groupId: string) =>
  useGroupMemberChange((memberId) => removeGroupMember(api, groupId, memberId));
