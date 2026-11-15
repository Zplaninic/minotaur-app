import { guardianQueries } from "@repo/shared/client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export const useGuardians = () => useQuery(guardianQueries.list(api));
