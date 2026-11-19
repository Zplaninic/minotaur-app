import type { GroupMemberResponse, GroupResponse, MemberResponse, MemberRole, MeResponse } from "@repo/shared";
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

const admin: MeResponse = { memberId: "9", name: "Zvonimir", surname: "Admin", email: "admin@example.com", role: "admin" };

let group: GroupResponse;

const savedGroup: GroupResponse = {
  id: "1",
  owner: { id: "2", name: "Petra", surname: "Kovač" },
  days: ["monday", "wednesday"],
  from: "17:00",
  to: "18:30",
  ageFrom: null,
  ageTo: null,
  memberCount: 1,
  createdAt: "2026-11-15T17:00:00.000Z",
  updatedAt: "2026-11-15T17:00:00.000Z",
};

const member = (id: string, name: string, surname: string, role: MemberRole): MemberResponse => ({
  id,
  orgId: "1",
  name,
  surname,
  birthday: "2014-03-12",
  role,
  taxNumber: null,
  email: null,
  phone: null,
  guardians: [],
  createdAt: "2026-11-15T17:00:00.000Z",
});

const everyone = [
  member("2", "Petra", "Kovač", "trainer"),
  member("4", "Ana", "Horvat", "child"),
  member("5", "Marko", "Novak", "member"),
];

let me: MeResponse;
let groupMembers: GroupMemberResponse[];

beforeEach(() => {
  me = admin;
  group = savedGroup;
  groupMembers = [
    {
      id: "4",
      name: "Ana",
      surname: "Horvat",
      birthday: "2014-03-12",
      email: null,
      phone: "+385 91 123 4567",
      guardians: [{ id: "1", name: "Iva", surname: "Horvat", email: null, phone: null }],
    },
  ];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return me;
    }
    if (path === "/groups/1" && init?.method === "DELETE") {
      return undefined;
    }
    if (path === "/groups/1" && init?.method === "PUT") {
      group = { ...group, ...JSON.parse(String(init.body)) };
      return group;
    }
    if (path === "/groups/1") {
      return group;
    }
    if (path === "/groups") {
      return { items: [] };
    }
    if (path === "/groups/1/members") {
      return { items: groupMembers };
    }
    if (path === "/groups/1/members/5" && init?.method === "PUT") {
      groupMembers = [
        ...groupMembers,
        { id: "5", name: "Marko", surname: "Novak", birthday: "2014-03-12", email: null, phone: null, guardians: [] },
      ];
      return undefined;
    }
    if (path === "/groups/1/members/4" && init?.method === "DELETE") {
      groupMembers = groupMembers.filter((groupMember) => groupMember.id !== "4");
      return undefined;
    }
    if (path.startsWith("/members?")) {
      return { items: everyone, page: 1, pageSize: 100, total: everyone.length };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={createAppRouter(createMemoryHistory({ initialEntries: [path] }))} />
    </QueryClientProvider>,
  );

describe("GroupPage", () => {
  it("shows the group and its members", async () => {
    renderAt("/groups/1");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Petra Kovač - Monday, Wednesday - 5:00 PM - 6:30 PM" }),
    ).toBeInTheDocument();
    const row = (await screen.findByRole("rowheader", { name: "Horvat Ana" })).closest("tr");
    expect(within(row as HTMLElement).getByText("Mar 12, 2014")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("+385 91 123 4567")).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("Iva Horvat")).toBeInTheDocument();
  });

  it("names the group with its age range", async () => {
    group = { ...savedGroup, ageFrom: 7, ageTo: 10 };
    renderAt("/groups/1");
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Petra Kovač - 7–10 yrs - Monday, Wednesday - 5:00 PM - 6:30 PM",
      }),
    ).toBeInTheDocument();
  });

  it("edits the group's age range", async () => {
    renderAt("/groups/1");
    fireEvent.click(await screen.findByRole("button", { name: t("group.edit") }));
    const dialog = screen.getByRole("dialog", { name: t("groupForm.editTitle") });
    const ageFrom = await within(dialog).findByLabelText(t("groupForm.ageFrom"), { exact: false });
    expect(within(dialog).getByLabelText(t("groupForm.from"))).toHaveValue("17:00");
    fireEvent.change(ageFrom, { target: { value: "12" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t("groupForm.submit") }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1",
      expect.anything(),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          ownerId: "2",
          days: ["monday", "wednesday"],
          from: "17:00",
          to: "18:30",
          ageFrom: 12,
          ageTo: null,
        }),
      }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Petra Kovač - 12+ yrs - Monday, Wednesday - 5:00 PM - 6:30 PM",
      }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when the group has no members", async () => {
    groupMembers = [];
    renderAt("/groups/1");
    expect(await screen.findByText(t("groupMembers.empty"))).toBeInTheDocument();
  });

  it("shows an error for a group that does not exist", async () => {
    renderAt("/groups/77");
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not find what you were looking for.");
  });

  it("offers only children and members who are not in the group, and adds the chosen one", async () => {
    renderAt("/groups/1");
    fireEvent.click(await screen.findByRole("button", { name: t("groupMembers.add") }));
    const dialog = screen.getByRole("dialog", { name: t("groupMemberForm.title") });
    const select = await within(dialog).findByLabelText(t("groupMemberForm.member"));
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      t("groupMemberForm.memberPlaceholder"),
      "Novak Marko",
    ]);

    fireEvent.change(select, { target: { value: "5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t("groupMemberForm.submit") }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/members/5",
      expect.anything(),
      expect.objectContaining({ method: "PUT" }),
    );
    expect(await screen.findByRole("rowheader", { name: "Novak Marko" })).toBeInTheDocument();
  });

  it("asks for a member and sends nothing when none is chosen", async () => {
    renderAt("/groups/1");
    fireEvent.click(await screen.findByRole("button", { name: t("groupMembers.add") }));
    const dialog = screen.getByRole("dialog", { name: t("groupMemberForm.title") });
    await within(dialog).findByLabelText(t("groupMemberForm.member"));
    fireEvent.click(within(dialog).getByRole("button", { name: t("groupMemberForm.submit") }));

    expect(within(dialog).getByText(t("groupMemberForm.error.member"))).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ method: "PUT" }));
  });

  it("removes a member after confirming", async () => {
    renderAt("/groups/1");
    fireEvent.click(await screen.findByRole("button", { name: t("groupMembers.removeLabel", { name: "Ana Horvat" }) }));
    const confirm = screen.getByRole("dialog", { name: t("groupMembers.confirmTitle", { name: "Ana Horvat" }) });
    fireEvent.click(within(confirm).getByRole("button", { name: t("common.remove") }));

    expect(await screen.findByText(t("groupMembers.empty"))).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/members/4",
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("keeps the member when the removal is cancelled", async () => {
    renderAt("/groups/1");
    fireEvent.click(await screen.findByRole("button", { name: t("groupMembers.removeLabel", { name: "Ana Horvat" }) }));
    const confirm = screen.getByRole("dialog", { name: t("groupMembers.confirmTitle", { name: "Ana Horvat" }) });
    fireEvent.click(within(confirm).getByRole("button", { name: t("common.cancel") }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("rowheader", { name: "Horvat Ana" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ method: "DELETE" }));
  });

  it("shows a trainer the members without the add and remove buttons", async () => {
    me = { ...admin, role: "trainer" };
    renderAt("/groups/1");
    expect(await screen.findByRole("rowheader", { name: "Horvat Ana" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("groupMembers.add") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("group.delete") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t("group.edit") })).not.toBeInTheDocument();
  });

  it("deletes the group after confirming and goes back to the groups", async () => {
    renderAt("/groups/1");
    fireEvent.click(await screen.findByRole("button", { name: t("group.delete") }));
    const confirm = screen.getByRole("dialog", { name: t("group.deleteConfirmTitle") });
    fireEvent.click(within(confirm).getByRole("button", { name: t("common.delete") }));

    expect(await screen.findByRole("heading", { name: t("groups.title") })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/groups/1", expect.anything(), expect.objectContaining({ method: "DELETE" }));
  });
});
