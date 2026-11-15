import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { HomePage } from "./HomePage";
import { NotFoundPage } from "./NotFoundPage";
import { RootLayout } from "./RootLayout";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
