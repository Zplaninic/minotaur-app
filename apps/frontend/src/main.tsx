import "@fontsource-variable/figtree";
import "@fontsource-variable/red-hat-display";
import "./tokens.css";
import "./global.css";

import { authKeys, toErrorCode } from "@repo/shared/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { router } from "./routes/router";

// Any request answered with 401 means the session has ended: mark the member
// as logged out, and the layout sends them to the login page.
const onError = (error: unknown) => {
  if (toErrorCode(error) === "UNAUTHORIZED") {
    queryClient.setQueryData(authKeys.me(), null);
  }
};

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root is missing from index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
