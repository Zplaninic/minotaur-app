import { listMembersResponse, memberResponse, type CreateMemberBody, type PaginationQuery } from "@repo/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { guardianKeys } from "./guardians";

export const memberKeys = {
  all: ["members"] as const,
  list: (query: PaginationQuery) => [...memberKeys.all, "list", query] as const,
};

export const useMembers = (query: PaginationQuery) =>
  useQuery({
    queryKey: memberKeys.list(query),
    queryFn: () => apiFetch(`/members?${new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })}`, listMembersResponse),
    placeholderData: keepPreviousData,
  });

export const useCreateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMemberBody) =>
      apiFetch("/members", memberResponse, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: memberKeys.all }),
        // A new member can bring new guardians with it.
        queryClient.invalidateQueries({ queryKey: guardianKeys.all }),
      ]);
    },
  });
};
