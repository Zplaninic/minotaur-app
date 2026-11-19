import type { CreateGroupBody } from "@repo/shared";
import {
  addGroupMember,
  archiveGroup,
  createGroup,
  groupQueries,
  keysToInvalidateAfterArchiveGroup,
  keysToInvalidateAfterCreateGroup,
  keysToInvalidateAfterGroupMemberChange,
  keysToInvalidateAfterUpdateGroup,
  removeGroupMember,
  updateGroup,
} from "@repo/shared/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const useGroups = () => useQuery(groupQueries.list(api));

export const useGroup = (groupId: string) => useQuery(groupQueries.detail(api, groupId));

export const useGroupMembers = (groupId: string) => useQuery(groupQueries.members(api, groupId));

// Creates a group, or replaces the group with groupId when one is given.
export const useSaveGroup = (groupId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupBody) =>
      groupId === undefined ? createGroup(api, body) : updateGroup(api, groupId, body),
    onSuccess: async () => {
      const keys = groupId === undefined ? keysToInvalidateAfterCreateGroup : keysToInvalidateAfterUpdateGroup;
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
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

// The page of the archived group is left right after, so its queries are only
// marked stale: refetching them now would answer NOT_FOUND on the way out.
export const useArchiveGroup = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveGroup(api, groupId),
    onSuccess: async () => {
      await Promise.all(
        keysToInvalidateAfterArchiveGroup.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, refetchType: "none" }),
        ),
      );
    },
  });
};
