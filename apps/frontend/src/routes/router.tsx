import { createRootRoute, createRoute, createRouter, Outlet, type RouterHistory } from "@tanstack/react-router";
import { month } from "@repo/shared";
import { z } from "zod";
import { AppLayout } from "./AppLayout";
import { AttendancePage } from "./AttendancePage";
import { GroupPage } from "./GroupPage";
import { GroupsPage } from "./GroupsPage";
import { HomePage } from "./HomePage";
import { LoginPage } from "./LoginPage";
import { MembersPage } from "./MembersPage";
import { NotFoundPage } from "./NotFoundPage";
import { SubscriptionsPage } from "./SubscriptionsPage";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
});

// Pathless layout: every page below needs a login.
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: HomePage,
});

const membersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/members",
  component: MembersPage,
});

const groupsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/groups",
  component: GroupsPage,
});

const groupRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/groups/$groupId",
  component: GroupPage,
});

const subscriptionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/subscriptions",
  component: SubscriptionsPage,
});

// A missing or malformed month means the current one.
const attendanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/groups/$groupId/attendance",
  validateSearch: z.object({ month: month.optional().catch(undefined) }),
  component: AttendancePage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([homeRoute, membersRoute, groupsRoute, groupRoute, attendanceRoute, subscriptionsRoute]),
]);

export const createAppRouter = (history?: RouterHistory) =>
  createRouter({ routeTree, ...(history ? { history } : {}) });

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
