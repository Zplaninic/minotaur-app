import type {
  DashboardResponse,
  GroupResponse,
  MeResponse,
  OverduePaymentsResponse,
  SubscriptionSummaryResponse,
} from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { translate as t } from "../lib/messages";
import { createAppRouter } from "./router";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const trainer: MeResponse = { memberId: "5", name: "Iva", surname: "Kovač", email: "iva@example.com", role: "trainer" };

const group = (id: string, ownerId: string, surname: string, days: GroupResponse["days"], from: string): GroupResponse => ({
  id,
  owner: { id: ownerId, name: "Ana", surname },
  days,
  from,
  to: "20:00",
  ageFrom: null,
  ageTo: null,
  memberCount: 6,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
});

let dashboard: DashboardResponse;
let dashboardFails: boolean;
let summary: SubscriptionSummaryResponse;
let overdue: OverduePaymentsResponse;

beforeEach(() => {
  dashboardFails = false;
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
  overdue = {
    items: [{ id: "40", name: "Leo", surname: "Perić", months: [], total: 4500 }],
    total: 4500,
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path) => {
    switch (path) {
      case "/me":
        return trainer;
      case "/dashboard":
        if (dashboardFails) {
          throw new ApiError("INTERNAL_ERROR", 500);
        }
        return dashboard;
      case "/groups":
        return {
          items: [
            group("1", "8", "Babić", ["monday"], "17:00"),
            group("2", "5", "Kovač", ["monday", "wednesday"], "18:00"),
            group("3", "8", "Babić", ["tuesday"], "16:00"),
          ],
        };
      case "/subscriptions/summary?month=2026-11":
        return summary;
      case "/subscriptions/overdue":
        return overdue;
      default:
        throw new ApiError("NOT_FOUND", 404);
    }
  });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={createAppRouter(createMemoryHistory({ initialEntries: ["/"] }))} />
    </QueryClientProvider>,
  );

const section = async (title: string) => (await screen.findByRole("heading", { name: title })).closest("section") as HTMLElement;

describe("HomePage", () => {
  it("shows the app name as the page heading", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: t("app.name") })).toBeInTheDocument();
  });

  it("lists today's trainings, the trainer's own group first, each linking to its attendance", async () => {
    renderPage();
    const today = await section(t("dashboard.today.title"));
    const links = await within(today).findAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["6:00 PM – 8:00 PM, Ana Kovač", "5:00 PM – 8:00 PM, Ana Babić"]);
    expect(links[0]).toHaveAttribute("href", "/groups/2/attendance?month=2026-11");
    expect(within(today).getByText(t("dashboard.today.mine"))).toBeInTheDocument();
  });

  it("lists unpaid months and members without a subscription", async () => {
    renderPage();
    const attention = await section(t("dashboard.attention.title"));
    expect(
      await within(attention).findByRole("link", { name: "Not paid for November 2026: 2" }),
    ).toHaveAttribute("href", "/subscriptions");
    expect(
      within(attention).getByRole("link", { name: "Owing for earlier months: 1, €45.00 in total" }),
    ).toBeInTheDocument();
    expect(within(attention).getByText("No subscription in November 2026: 1")).toBeInTheDocument();
    expect(within(attention).getByRole("link", { name: "Nora Jurić" })).toHaveAttribute(
      "href",
      "/groups/2/attendance?month=2026-11",
    );
  });

  it("says all is good when nothing needs attention", async () => {
    dashboard = { ...dashboard, withoutSubscription: [] };
    summary = { ...summary, unpaid: 0 };
    overdue = { items: [], total: 0 };
    renderPage();
    const attention = await section(t("dashboard.attention.title"));
    expect(await within(attention).findByText(t("dashboard.attention.allGood"))).toBeInTheDocument();
  });

  it("shows the month in numbers", async () => {
    renderPage();
    const overview = await section(t("dashboard.overview.title"));
    expect(await within(overview).findByText("42")).toBeInTheDocument();
    expect(within(overview).getByText("75%")).toBeInTheDocument();
    expect(within(overview).getByText("€45.00")).toBeInTheDocument();
    expect(within(overview).getByText("of €135.00")).toBeInTheDocument();
  });

  it("shows an error with a retry when the dashboard fails to load", async () => {
    dashboardFails = true;
    renderPage();
    const overview = await section(t("dashboard.overview.title"));
    expect(await within(overview).findByRole("alert")).toBeInTheDocument();

    dashboardFails = false;
    fireEvent.click(within(overview).getByRole("button", { name: t("common.retry") }));
    expect(await within(overview).findByText("42")).toBeInTheDocument();
  });
});
