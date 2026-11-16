import { dashboardQueries } from "@repo/shared/client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export const useDashboard = () => useQuery(dashboardQueries.summary(api));
