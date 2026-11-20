import type { GuardianResponse, MeResponse, MemberResponse } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } })}>
    <SafeAreaProvider initialMetrics={metrics}>{children}</SafeAreaProvider>
  </QueryClientProvider>
);

export const iva: GuardianResponse = { id: "1", name: "Iva", surname: "Horvat", email: null, phone: "+385 91 123 4567" };

export const ana: MemberResponse = {
  id: "1",
  orgId: "1",
  name: "Ana",
  surname: "Horvat",
  birthday: "2014-03-12",
  role: "child",
  taxNumber: null,
  email: null,
  phone: null,
  guardians: [iva],
  createdAt: "2026-11-15T17:00:00.000Z",
};

export const admin: MeResponse = {
  memberId: "9",
  name: "Zvonimir",
  surname: "Admin",
  email: "admin@example.com",
  role: "admin",
  org: { id: "1", name: "SPK Minotaur" },
};
