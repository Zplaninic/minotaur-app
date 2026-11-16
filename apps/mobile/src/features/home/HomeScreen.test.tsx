import type { DashboardResponse, GroupResponse, OverduePaymentsResponse, SubscriptionSummaryResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { clearSessionToken } from "../../lib/sessionToken";
import { admin } from "../members/testUtils";
import { HomeScreen } from "./HomeScreen";

const mockPush = jest.fn();

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderScreen = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } })}
    >
      <SafeAreaProvider initialMetrics={metrics}>
        <HomeScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );

const group = (id: string, ownerId: string, surname: string, days: GroupResponse["days"], from: string): GroupResponse => ({
  id,
  owner: { id: ownerId, name: "Ana", surname },
  days,
  from,
  to: "20:00",
  memberCount: 6,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
});

let dashboard: DashboardResponse;
let summary: SubscriptionSummaryResponse;
let overdue: OverduePaymentsResponse;
let offline: boolean;

beforeEach(() => {
  mockPush.mockReset();
  offline = false;
  dashboard = {
    today: "2026-11-16",
    month: "2026-11",
    activeMembers: 42,
    withoutSubscription: [{ id: "31", name: "Nora", surname: "Jurić", groupIds: ["2", "3"] }],
    attendance: { expected: 8, attended: 6 },
  };
  summary = {
    month: "2026-11",
    members: 3,
    paid: 1,
    unpaid: 2,
    expected: 13500,
    collected: 4500,
    open: 9000,
    bySubscription: [],
  };
  overdue = { items: [{ id: "40", name: "Leo", surname: "Perić", months: [], total: 4500 }], total: 4500 };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path) => {
    if (path === "/me") {
      return admin;
    }
    if (offline) {
      throw new ApiError("NETWORK_ERROR");
    }
    switch (path) {
      case "/dashboard":
        return dashboard;
      case "/groups":
        return {
          items: [
            group("1", "8", "Babić", ["monday"], "17:00"),
            // Owned by the logged-in admin.
            group("2", "9", "Admin", ["monday", "wednesday"], "18:00"),
            group("3", "8", "Babić", ["tuesday"], "16:00"),
          ],
        };
      case "/subscriptions/summary?month=2026-11":
        return summary;
      case "/subscriptions/overdue":
        return overdue;
      case "/auth/logout":
        return undefined;
      default:
        throw new ApiError("NOT_FOUND", 404);
    }
  });
});

describe("HomeScreen", () => {
  it("shows the app name, who is logged in, and the members and groups buttons for an admin", async () => {
    await renderScreen();
    expect(screen.getByRole("header", { name: t("app.name") })).toBeOnTheScreen();
    expect(await screen.findByText(t("home.loggedInAs", { name: "Zvonimir Admin" }))).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("home.members") })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("home.groups") })).toBeOnTheScreen();
  });

  it("lists today's trainings, the viewer's own group first, and opens its attendance", async () => {
    await renderScreen();
    const links = await screen.findAllByRole("link", { name: /^Open attendance/ });
    expect(links.map((link) => link.props.accessibilityLabel)).toEqual([
      "Open attendance: 6:00 PM – 8:00 PM, Ana Admin",
      "Open attendance: 5:00 PM – 8:00 PM, Ana Babić",
    ]);
    const mine = screen.getByRole("link", { name: "Open attendance: 6:00 PM – 8:00 PM, Ana Admin" });
    expect(within(mine).getByText(t("dashboard.today.mine"))).toBeOnTheScreen();

    await fireEvent.press(mine);
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/groups/[id]/attendance", params: { id: "2" } });
  });

  it("lists what needs attention and opens a member's subscription", async () => {
    await renderScreen();
    expect(await screen.findByRole("link", { name: "Not paid for November 2026: 2" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Owing for earlier months: 1, €45.00 in total" })).toBeOnTheScreen();
    expect(screen.getByText("No subscription in November 2026: 1")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("link", { name: t("dashboard.attention.setSubscription", { name: "Nora Jurić" }) }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]/member-subscription",
      params: { id: "2", month: "2026-11", memberId: "31" },
    });
  });

  it("says all is good when nothing needs attention", async () => {
    dashboard = { ...dashboard, withoutSubscription: [] };
    summary = { ...summary, unpaid: 0 };
    overdue = { items: [], total: 0 };
    await renderScreen();
    expect(await screen.findByText(t("dashboard.attention.allGood"))).toBeOnTheScreen();
  });

  it("shows the month in numbers", async () => {
    await renderScreen();
    expect(await screen.findByText("42")).toBeOnTheScreen();
    expect(screen.getByText("75%")).toBeOnTheScreen();
    expect(screen.getByText("€45.00")).toBeOnTheScreen();
    expect(screen.getByText("of €135.00")).toBeOnTheScreen();
  });

  it("shows no connection with a retry when offline", async () => {
    offline = true;
    await renderScreen();
    expect((await screen.findAllByText(t("dashboard.offlineTitle"))).length).toBeGreaterThan(0);

    offline = false;
    for (const retry of screen.getAllByRole("button", { name: t("common.retry") })) {
      await fireEvent.press(retry);
    }
    expect(await screen.findByText("42")).toBeOnTheScreen();
  });

  it("logs out and forgets the session token", async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole("button", { name: t("home.logout") }));
    await waitFor(() => expect(clearSessionToken).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/auth/logout", expect.anything(), expect.anything());
  });
});
