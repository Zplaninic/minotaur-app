import { listOrgsResponse } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

export const orgKeys = {
  all: ["orgs"] as const,
  list: () => [...orgKeys.all, "list"] as const,
};

export const useOrgs = () =>
  useQuery({
    queryKey: orgKeys.list(),
    queryFn: () => apiFetch("/orgs", listOrgsResponse),
  });
