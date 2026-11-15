import type { GroupResponse, MemberResponse, MeResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { t } from "../lib/messages";
import { GroupsPage } from "./GroupsPage";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const admin: MeResponse = { memberId: "9", name: "Zvonimir", surname: "Admin", email: "admin@example.com", role: "admin" };

const petra: MemberResponse = {
  id: "2",
  orgId: "1",
  name: "Petra",
  surname: "Kovač",
  birthday: "1990-05-01",
  role: "trainer",
  taxNumber: null,
  email: "petra@example.com",
  phone: null,
  guardians: [],
  createdAt: "2026-11-15T17:00:00.000Z",
};

const mondayGroup: GroupResponse = {
  id: "1",
  owner: { id: "2", name: "Petra", surname: "Kovač" },
  days: ["monday", "wednesday"],
  from: "17:00",
  to: "18:30",
  createdAt: "2026-11-15T17:00:00.000Z",
  updatedAt: "2026-11-15T17:00:00.000Z",
};

const fridayGroup: GroupResponse = { ...mondayGroup, id: "2", days: ["friday"], from: "09:00", to: "10:00" };

let me: MeResponse;
let groups: GroupResponse[];

beforeEach(() => {
  me = admin;
  groups = [mondayGroup];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return me;
    }
    if (path.startsWith("/members?role=trainer")) {
      return { items: [petra], page: 1, pageSize: 100, total: 1 };
    }
    if (path === "/groups" && init?.method === "POST") {
      groups = [...groups, fridayGroup];
      return fridayGroup;
    }
    if (path === "/groups") {
      return { items: groups };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GroupsPage />
    </QueryClientProvider>,
  );

const openDialog = async () => {
  fireEvent.click(await screen.findByRole("button", { name: t("groups.add") }));
  const dialog = screen.getByRole("dialog", { name: t("groupForm.title") });
  await within(dialog).findByLabelText(t("groupForm.owner"));
  return dialog;
};

const save = (dialog: HTMLElement) =>
  fireEvent.click(within(dialog).getByRole("button", { name: t("groupForm.submit") }));

describe("GroupsPage", () => {
  it("lists groups named after their trainer, days and time", async () => {
    renderPage();
    const row = (await screen.findByRole("rowheader", { name: "Petra Kovač - Monday, Wednesday - 5:00 PM - 6:30 PM" })).closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Kovač Petra")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Monday, Wednesday")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("5:00 PM – 6:30 PM")).toBeInTheDocument();
  });

  it("shows the empty state when there are no groups", async () => {
    groups = [];
    renderPage();
    expect(await screen.findByText(t("groups.empty"))).toBeInTheDocument();
  });

  it("shows a trainer the list without the add button", async () => {
    me = { ...admin, role: "trainer" };
    renderPage();
    expect(await screen.findByRole("rowheader", { name: "Petra Kovač - Monday, Wednesday - 5:00 PM - 6:30 PM" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("groups.add") })).not.toBeInTheDocument();
  });

  it("shows field errors and sends nothing when the form is empty", async () => {
    renderPage();
    const dialog = await openDialog();
    save(dialog);

    expect(within(dialog).getByText(t("groupForm.error.owner"))).toBeInTheDocument();
    expect(within(dialog).getByText(t("groupForm.error.days"))).toBeInTheDocument();
    expect(within(dialog).getByText(t("groupForm.error.from"))).toBeInTheDocument();
    expect(within(dialog).getByText(t("groupForm.error.to"))).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/groups", expect.anything(), expect.anything());
  });

  it("asks for an end time after the start time", async () => {
    renderPage();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.from")), { target: { value: "10:00" } });
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.to")), { target: { value: "09:00" } });
    save(dialog);

    expect(within(dialog).getByText(t("groupForm.error.timeOrder"))).toBeInTheDocument();
  });

  it("saves a group, closes the popup and shows the new row", async () => {
    renderPage();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.owner")), { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: t("weekday.friday") }));
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.from")), { target: { value: "09:00" } });
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.to")), { target: { value: "10:00" } });
    save(dialog);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups",
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ownerId: "2", days: ["friday"], from: "09:00", to: "10:00" }),
      }),
    );
    expect(await screen.findByText("9:00 AM – 10:00 AM")).toBeInTheDocument();
  });
});
