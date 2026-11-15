import { listGuardiansResponse } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

export const guardianKeys = {
  all: ["guardians"] as const,
  list: () => [...guardianKeys.all, "list"] as const,
};

export const useGuardians = () =>
  useQuery({
    queryKey: guardianKeys.list(),
    queryFn: () => apiFetch("/guardians", listGuardiansResponse),
  });
