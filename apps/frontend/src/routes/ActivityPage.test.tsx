import type { AuditEventResponse, ListAuditEventsResponse, MeResponse, MemberResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { translate as t } from "../lib/messages";
import { createAppRouter } from "./router";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const admin: MeResponse = {
  memberId: "9",
  name: "Zvonimir",
  surname: "Admin",
  email: "admin@example.com",
  role: "admin",
  org: { id: "1", name: "SPK Minotaur" },
};

const trainer: MemberResponse = {
  id: "3",
  orgId: "1",
  name: "Ana",
  surname: "Trainer",
  birthday: "1990-01-01",
  role: "trainer",
  taxNumber: null,
  email: "ana@example.com",
  phone: null,
  guardians: [],
  createdAt: "2026-09-01T10:00:00.000Z",
};

const event = (id: string, overrides: Partial<AuditEventResponse> = {}): AuditEventResponse => ({
  id,
  action: "month_paid_set",
  createdAt: "2026-11-16T17:30:00.000Z",
  actor: { id: "3", name: "Ana", surname: "Trainer" },
  member: { id: "7", name: "Mia", surname: "Kid" },
  group: null,
  subscription: { id: "1", name: "Kids 2x" },
  enrollmentRequestId: null,
  enrollmentChild: null,
  month: "2026-11",
  date: null,
  changes: { paid: { from: false, to: true } },
  ...overrides,
});

let me: MeResponse;
let pages: Record<string, ListAuditEventsResponse>;
let requested: string[];

beforeEach(() => {
  me = admin;
  requested = [];
  pages = {
    "/audit-events": {
      items: [
        event("2"),
        event("1", {
          action: "member_updated",
          actor: null,
          subscription: null,
          month: null,
          changes: { email: { changed: true } },
        }),
      ],
      nextCursor: "1",
    },
    "/audit-events?before=1": {
      items: [event("0", { action: "member_created", member: { id: "8", name: "Leo", surname: "New" }, changes: {} })],
      nextCursor: null,
    },
    "/audit-events?actorId=3": { items: [event("2")], nextCursor: null },
  };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path) => {
    requested.push(path);
    if (path === "/me") {
      return me;
    }
    if (path.startsWith("/members?role=admin")) {
      return { items: [], page: 1, pageSize: 100, total: 0 };
    }
    if (path.startsWith("/members?role=trainer")) {
      return { items: [trainer], page: 1, pageSize: 100, total: 1 };
    }
    const page = pages[path];
    if (page) {
      return page;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={createAppRouter(createMemoryHistory({ initialEntries: ["/activity"] }))} />
    </QueryClientProvider>,
  );

const rowOf = async (action: Parameters<typeof t>[0]) =>
  (await screen.findByRole("rowheader", { name: t(action) })).closest("tr") as HTMLElement;

describe("ActivityPage", () => {
  it("shows who did what, newest first, and loads more", async () => {
    renderPage();

    const paid = await rowOf("activity.action.month_paid_set");
    expect(within(paid).getByText("Ana Trainer")).toBeInTheDocument();
    expect(within(paid).getByText("Mia Kid")).toBeInTheDocument();
    expect(within(paid).getByText("Kids 2x")).toBeInTheDocument();
    expect(
      within(paid).getByText(
        t("activity.change", { field: t("activity.field.paid"), from: t("activity.no"), to: t("activity.yes") }),
      ),
    ).toBeInTheDocument();

    const edited = await rowOf("activity.action.member_updated");
    expect(within(edited).getByText(t("activity.system"))).toBeInTheDocument();
    expect(
      within(edited).getByText(t("activity.changedField", { field: t("activity.field.email") })),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t("activity.loadMore") }));
    expect(await rowOf("activity.action.member_created")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("activity.loadMore") })).not.toBeInTheDocument();
  });

  it("filters by who did it", async () => {
    renderPage();
    await rowOf("activity.action.member_updated");

    // Every filter is marked optional after its label.
    const actor = screen.getByRole("combobox", { name: new RegExp(`^${t("activity.filters.actor")}`) });
    await within(actor).findByRole("option", { name: "Ana Trainer" });
    fireEvent.change(actor, { target: { value: "3" } });

    await waitFor(() => expect(requested).toContain("/audit-events?actorId=3"));
    await waitFor(() =>
      expect(screen.queryByRole("rowheader", { name: t("activity.action.member_updated") })).not.toBeInTheDocument(),
    );
    expect(await rowOf("activity.action.month_paid_set")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    pages["/audit-events"] = { items: [], nextCursor: null };
    renderPage();
    expect(await screen.findByText(t("activity.empty"))).toBeInTheDocument();
  });

  it("gives a trainer no link and no access", async () => {
    me = { ...admin, role: "trainer" };
    renderPage();
    expect(await screen.findByText(t("auth.noAccess"))).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: t("nav.activity") })).not.toBeInTheDocument();
    expect(requested.some((path) => path.startsWith("/audit-events"))).toBe(false);
  });
});
