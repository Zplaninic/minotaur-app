import { authKeys, toErrorCode } from "@repo/shared/client";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { clearSessionToken } from "../lib/sessionToken";

// Any request answered with 401 means the session has ended: forget the token
// and mark the member as logged out, which shows the login screen.
const onError = (error: unknown) => {
  if (toErrorCode(error) === "UNAUTHORIZED") {
    void clearSessionToken();
    queryClient.setQueryData(authKeys.me(), null);
  }
};

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
});
