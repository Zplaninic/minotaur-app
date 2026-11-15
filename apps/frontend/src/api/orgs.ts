import { orgQueries } from "@repo/shared/client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export const useOrgs = () => useQuery(orgQueries.list(api));
