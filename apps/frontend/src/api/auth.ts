import { loginBody, type LoginInput } from "@repo/shared";
import { defineAbilityFor, emptyAbility, type AppAbility } from "@repo/shared/auth";
import { authKeys, authQueries, login, logout } from "@repo/shared/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "./client";

// The logged-in member; data is null when logged out.
export const useMe = () => useQuery({ ...authQueries.me(api), retry: false, staleTime: Infinity });

// What the logged-in member may do. Only for showing and hiding things: the backend decides.
export const useAbility = (): AppAbility => {
  const me = useMe();
  return useMemo(
    () => (me.data ? defineAbilityFor({ memberId: me.data.memberId, role: me.data.role }) : emptyAbility()),
    [me.data],
  );
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(api, loginBody.parse({ ...input, transport: "cookie" })),
    onSuccess: (result) => {
      queryClient.setQueryData(authKeys.me(), result.me);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(api),
    // Logged out even if the request fails: the session cookie may already be gone.
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me(), null);
    },
  });
};
