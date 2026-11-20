import type { GroupResponse, MemberResponse, MeResponse } from "@repo/shared";
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
  ageFrom: null,
  ageTo: null,
  maxMembers: null,
  memberCount: 3,
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
      <RouterProvider router={createAppRouter(createMemoryHistory({ initialEntries: ["/groups"] }))} />
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
    expect(within(row as HTMLElement).getByText("Petra Kovač")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Monday, Wednesday")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("5:00 PM – 6:30 PM")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByRole("cell", { name: "3" })).toBeInTheDocument();
    expect(within(row as HTMLElement).getByRole("link")).toHaveAttribute("href", "/groups/1");
  });

  it("shows the member count against the limit, and a badge when over it", async () => {
    groups = [{ ...mondayGroup, maxMembers: 3 }, { ...fridayGroup, maxMembers: 2 }];
    renderPage();
    const full = (await screen.findByText("3 / 3")).closest("tr") as HTMLElement;
    expect(within(full).queryByText(t("groups.overLimit"))).not.toBeInTheDocument();
    const over = screen.getByText("3 / 2").closest("tr") as HTMLElement;
    expect(within(over).getByText(t("groups.overLimit"))).toBeInTheDocument();
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

  it("asks for an upper age that is not below the lower age", async () => {
    renderPage();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.ageFrom"), { exact: false }), {
      target: { value: "10" },
    });
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.ageTo"), { exact: false }), {
      target: { value: "7" },
    });
    save(dialog);

    expect(within(dialog).getByText(t("groupForm.error.ageOrder"))).toBeInTheDocument();
  });

  it("asks for a member limit from 1 to 999", async () => {
    renderPage();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.maxMembers"), { exact: false }), {
      target: { value: "0" },
    });
    save(dialog);

    expect(within(dialog).getByText(t("groupForm.error.maxMembers"))).toBeInTheDocument();
  });

  it("saves a group, closes the popup and shows the new row", async () => {
    renderPage();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.owner")), { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: t("weekday.friday") }));
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.from")), { target: { value: "09:00" } });
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.to")), { target: { value: "10:00" } });
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.ageFrom"), { exact: false }), {
      target: { value: "7" },
    });
    fireEvent.change(within(dialog).getByLabelText(t("groupForm.maxMembers"), { exact: false }), {
      target: { value: "12" },
    });
    save(dialog);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups",
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          ownerId: "2",
          days: ["friday"],
          from: "09:00",
          to: "10:00",
          ageFrom: 7,
          ageTo: null,
          maxMembers: 12,
        }),
      }),
    );
    expect(await screen.findByText("9:00 AM – 10:00 AM")).toBeInTheDocument();
  });
});
