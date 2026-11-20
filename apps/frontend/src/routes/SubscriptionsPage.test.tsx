import type {
  MeResponse,
  OverduePaymentsResponse,
  SubscriptionBody,
  SubscriptionResponse,
  SubscriptionSummaryResponse,
} from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { translate as t } from "../lib/messages";
import { createAppRouter } from "./router";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const admin: MeResponse = { memberId: "9", name: "Zvonimir", surname: "Admin", email: "admin@example.com", role: "admin" };

const kids: SubscriptionResponse = {
  id: "1",
  name: "Kids 2x",
  sessionsPerWeek: 2,
  price: 4550,
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
};

let me: MeResponse;
let subscriptions: SubscriptionResponse[];
let conflict: boolean;
let overdue: OverduePaymentsResponse;

const summaryFor = (month: string): SubscriptionSummaryResponse =>
  month === "2026-10"
    ? {
        month,
        members: 3,
        paid: 1,
        unpaid: 2,
        expected: 13500,
        collected: 4500,
        open: 9000,
        bySubscription: [{ id: "1", name: "Kids 2x", members: 3, paid: 1, expected: 13500, collected: 4500 }],
      }
    : { month, members: 0, paid: 0, unpaid: 0, expected: 0, collected: 0, open: 0, bySubscription: [] };

const saved = (id: string, init: RequestInit | undefined): SubscriptionResponse => ({
  ...kids,
  ...(JSON.parse(String(init?.body)) as SubscriptionBody),
  id,
});

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 16, 18, 30));
  overdue = { items: [], total: 0 };
  me = admin;
  subscriptions = [kids];
  conflict = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return me;
    }
    if (conflict && init?.method) {
      throw new ApiError("CONFLICT", 409);
    }
    if (path === "/subscriptions" && init?.method === "POST") {
      const created = saved("2", init);
      subscriptions = [...subscriptions, created];
      return created;
    }
    if (path === "/subscriptions/1" && init?.method === "PUT") {
      const updated = saved("1", init);
      subscriptions = subscriptions.map((item) => (item.id === "1" ? updated : item));
      return updated;
    }
    const summary = /^\/subscriptions\/summary\?month=(\d{4}-\d{2})$/.exec(path);
    if (summary) {
      return summaryFor(summary[1] ?? "");
    }
    if (path === "/subscriptions/overdue") {
      return overdue;
    }
    if (path === "/subscriptions") {
      return { items: subscriptions };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={createAppRouter(createMemoryHistory({ initialEntries: ["/subscriptions"] }))} />
    </QueryClientProvider>,
  );

const openAddDialog = async () => {
  fireEvent.click(await screen.findByRole("button", { name: t("subscriptions.add") }));
  return screen.getByRole("dialog", { name: t("subscriptionForm.title") });
};

const fill = (dialog: HTMLElement, values: { name?: string; sessionsPerWeek?: string; price?: string }) => {
  const fields = [
    ["subscriptionForm.name", values.name],
    ["subscriptionForm.sessionsPerWeek", values.sessionsPerWeek],
    ["subscriptionForm.price", values.price],
  ] as const;
  for (const [label, value] of fields) {
    if (value !== undefined) {
      fireEvent.change(within(dialog).getByLabelText(t(label)), { target: { value } });
    }
  }
};

const save = (dialog: HTMLElement) =>
  fireEvent.click(within(dialog).getByRole("button", { name: t("subscriptionForm.submit") }));

describe("SubscriptionsPage", () => {
  it("lists subscriptions with sessions per week and price", async () => {
    renderPage();
    const row = (await screen.findByRole("rowheader", { name: "Kids 2x" })).closest("tr") as HTMLElement;
    expect(within(row).getByRole("cell", { name: "2" })).toBeInTheDocument();
    expect(within(row).getByRole("cell", { name: "€45.50" })).toBeInTheDocument();
  });

  it("shows the empty state when there are no subscriptions", async () => {
    subscriptions = [];
    renderPage();
    expect(await screen.findByText(t("subscriptions.empty"))).toBeInTheDocument();
  });

  it("tells a trainer they have no access and shows no subscriptions", async () => {
    me = { ...admin, role: "trainer" };
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(t("auth.noAccess"));
    expect(screen.queryByRole("rowheader", { name: "Kids 2x" })).not.toBeInTheDocument();
  });

  it("shows field errors and sends nothing when the form is empty", async () => {
    renderPage();
    const dialog = await openAddDialog();
    save(dialog);

    expect(within(dialog).getByText(t("subscriptionForm.error.name"))).toBeInTheDocument();
    expect(within(dialog).getByText(t("subscriptionForm.error.sessionsPerWeek"))).toBeInTheDocument();
    expect(within(dialog).getByText(t("subscriptionForm.error.price"))).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/subscriptions", expect.anything(), expect.anything());
  });

  it("adds a subscription with a price in euros, closes the popup and shows the new row", async () => {
    renderPage();
    const dialog = await openAddDialog();
    fill(dialog, { name: "Adults 3x", sessionsPerWeek: "3", price: "60,00" });
    save(dialog);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/subscriptions",
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Adults 3x", sessionsPerWeek: 3, price: 6000 }),
      }),
    );
    expect(await screen.findByRole("rowheader", { name: "Adults 3x" })).toBeInTheDocument();
  });

  it("edits a subscription starting from its current values", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t("subscriptions.editLabel", { name: "Kids 2x" }) }));
    const dialog = screen.getByRole("dialog", { name: t("subscriptionForm.editTitle") });
    expect(within(dialog).getByLabelText(t("subscriptionForm.price"))).toHaveValue("45.50");

    fill(dialog, { sessionsPerWeek: "1", price: "30" });
    save(dialog);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/subscriptions/1",
      expect.anything(),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Kids 2x", sessionsPerWeek: 1, price: 3000 }),
      }),
    );
    expect(await screen.findByRole("cell", { name: "€30.00" })).toBeInTheDocument();
  });

  it("shows a taken name next to the name field", async () => {
    conflict = true;
    renderPage();
    const dialog = await openAddDialog();
    fill(dialog, { name: "Kids 2x", sessionsPerWeek: "2", price: "45" });
    save(dialog);

    expect(await within(dialog).findByText(t("subscriptionForm.error.nameTaken"))).toBeInTheDocument();
  });
});

describe("SubscriptionsPage, payments", () => {
  it("shows a month's totals and steps between months", async () => {
    renderPage();
    expect(await screen.findByText(t("payments.empty", { month: "November 2026" }))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("payments.nextMonth") })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: t("payments.previousMonth") }));

    const figure = async (label: Parameters<typeof t>[0]) =>
      (await screen.findByText(t(label), { selector: "dt" })).nextElementSibling;
    expect(await figure("payments.expected")).toHaveTextContent("€135.00");
    expect(await figure("payments.collected")).toHaveTextContent("€45.00");
    expect(await figure("payments.open")).toHaveTextContent("€90.00");
    const payments = screen.getByRole("region", { name: t("payments.title") });
    const row = within(payments).getByRole("rowheader", { name: "Kids 2x" }).closest("tr") as HTMLElement;
    expect(within(row).getByText("€45.00 of €135.00")).toBeInTheDocument();
  });

  it("does not go back before September 2026", async () => {
    renderPage();
    const previous = await screen.findByRole("button", { name: t("payments.previousMonth") });
    fireEvent.click(previous);
    fireEvent.click(previous);
    expect(await screen.findByText("September 2026")).toBeInTheDocument();
    expect(previous).toBeDisabled();
  });

  it("lists members who have not paid a past month", async () => {
    overdue = {
      items: [
        {
          id: "4",
          name: "Leo",
          surname: "Perić",
          months: [
            { month: "2026-09", subscription: { id: "1", name: "Kids 2x" }, price: 4500 },
            { month: "2026-10", subscription: { id: "1", name: "Kids 2x" }, price: 4500 },
          ],
          total: 9000,
        },
      ],
      total: 9000,
    };
    renderPage();
    const row = (await screen.findByRole("rowheader", { name: "Leo Perić" })).closest("tr") as HTMLElement;
    expect(within(row).getByText("September 2026: Kids 2x, €45.00")).toBeInTheDocument();
    expect(within(row).getByText("October 2026: Kids 2x, €45.00")).toBeInTheDocument();
    expect(within(row).getByText("€90.00")).toBeInTheDocument();
    expect(screen.getByText(t("overdue.total", { total: "€90.00" }))).toBeInTheDocument();
  });

  it("says when everyone has paid", async () => {
    renderPage();
    expect(await screen.findByText(t("overdue.empty"))).toBeInTheDocument();
  });
});
