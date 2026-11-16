import type { MeResponse, SubscriptionBody, SubscriptionResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { t } from "../lib/messages";
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

const saved = (id: string, init: RequestInit | undefined): SubscriptionResponse => ({
  ...kids,
  ...(JSON.parse(String(init?.body)) as SubscriptionBody),
  id,
});

beforeEach(() => {
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

  it("shows a trainer the list without add or edit buttons", async () => {
    me = { ...admin, role: "trainer" };
    renderPage();
    expect(await screen.findByRole("rowheader", { name: "Kids 2x" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("subscriptions.add") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("subscriptions.editLabel", { name: "Kids 2x" }) })).not.toBeInTheDocument();
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
