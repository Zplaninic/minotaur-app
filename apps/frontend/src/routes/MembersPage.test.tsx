import type { MemberResponse } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@repo/shared/client";
import { api } from "../api/client";
import { t } from "../lib/messages";
import { MembersPage } from "./MembersPage";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const ana: MemberResponse = {
  id: "1",
  orgId: "1",
  name: "Ana",
  surname: "Horvat",
  birthday: "2014-03-12",
  role: "child",
  taxNumber: null,
  email: null,
  phone: null,
  guardians: [{ id: "1", name: "Iva", surname: "Horvat", email: null, phone: "+385 91 123 4567" }],
  createdAt: "2026-11-15T17:00:00.000Z",
};

const marko: MemberResponse = { ...ana, id: "2", name: "Marko", surname: "Babić", birthday: "1990-05-01", guardians: [] };

let members: MemberResponse[];

beforeEach(() => {
  members = [ana];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return { memberId: "9", name: "Zvonimir", surname: "Admin", email: "admin@example.com", role: "admin" };
    }
    if (path === "/orgs") {
      return { items: [{ id: "1", name: "SPK Minotaur" }] };
    }
    if (path === "/guardians") {
      return { items: ana.guardians };
    }
    if (path === "/members" && init?.method === "POST") {
      members = [marko, ...members];
      return marko;
    }
    if (path === "/members/1" && init?.method === "PUT") {
      const edited = { ...ana, ...JSON.parse(String(init.body)) };
      members = members.map((member) => (member.id === "1" ? { ...edited, guardians: ana.guardians } : member));
      return members[0];
    }
    if (path.startsWith("/members?")) {
      return { items: members, page: 1, pageSize: 20, total: members.length };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MembersPage />
    </QueryClientProvider>,
  );

const openDialog = async () => {
  fireEvent.click(await screen.findByRole("button", { name: t("members.add") }));
  const dialog = screen.getByRole("dialog", { name: t("memberForm.title") });
  await within(dialog).findByLabelText(t("memberForm.name"));
  return dialog;
};

const fill = (dialog: HTMLElement, label: string, value: string) =>
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });

describe("MembersPage", () => {
  it("lists members with their guardians", async () => {
    renderPage();
    const row = (await screen.findByRole("rowheader", { name: "Horvat Ana" })).closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Iva Horvat")).toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText(t("members.trainerLabel"))).not.toBeInTheDocument();
  });

  it("edits a member", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t("members.editLabel", { name: "Ana Horvat" }) }));
    const dialog = screen.getByRole("dialog", { name: t("memberForm.editTitle") });
    const name = await within(dialog).findByLabelText(t("memberForm.name"));
    expect(name).toHaveValue("Ana");

    fireEvent.change(name, { target: { value: "Anamarija" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t("memberForm.saveChanges") }));

    expect(await screen.findByRole("rowheader", { name: "Horvat Anamarija" })).toBeInTheDocument();
    const [, , init] = fetchMock.mock.calls.find(([path, , call]) => path === "/members/1" && call?.method === "PUT") ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Anamarija",
      surname: "Horvat",
      birthday: "2014-03-12",
      guardians: [{ kind: "existing", guardianId: "1" }],
    });
  });

  it("removes a guardian from the form only after confirming", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: t("members.editLabel", { name: "Ana Horvat" }) }));
    const dialog = screen.getByRole("dialog", { name: t("memberForm.editTitle") });
    const remove = await within(dialog).findByRole("button", { name: t("memberForm.guardianRemove", { number: 1 }) });

    fireEvent.click(remove);
    const confirm = screen.getByRole("dialog", { name: t("memberForm.guardianRemoveConfirmTitle", { number: 1 }) });
    fireEvent.click(within(confirm).getByRole("button", { name: t("common.cancel") }));
    expect(within(dialog).getByRole("group", { name: t("memberForm.guardianNumber", { number: 1 }) })).toBeInTheDocument();

    fireEvent.click(remove);
    fireEvent.click(
      within(screen.getByRole("dialog", { name: t("memberForm.guardianRemoveConfirmTitle", { number: 1 }) })).getByRole(
        "button",
        { name: t("common.remove") },
      ),
    );
    await waitFor(() =>
      expect(
        within(dialog).queryByRole("group", { name: t("memberForm.guardianNumber", { number: 1 }) }),
      ).not.toBeInTheDocument(),
    );
  });

  it("labels trainers", async () => {
    members = [{ ...marko, role: "trainer" }];
    renderPage();
    const row = (await screen.findByRole("rowheader", { name: /Babić Marko/ })).closest("tr");
    expect(within(row as HTMLElement).getByText(t("members.trainerLabel"))).toBeInTheDocument();
  });

  it("shows the empty state when there are no members", async () => {
    members = [];
    renderPage();
    expect(await screen.findByText(t("members.empty"))).toBeInTheDocument();
  });

  it("shows field errors and sends nothing when required fields are missing", async () => {
    renderPage();
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: t("memberForm.submit") }));

    expect(within(dialog).getByText(t("memberForm.error.name"))).toBeInTheDocument();
    expect(within(dialog).getByText(t("memberForm.error.birthday"))).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/members", expect.anything(), expect.anything());
  });

  it("asks for a guardian when the member is a minor", async () => {
    renderPage();
    const dialog = await openDialog();
    fill(dialog, t("memberForm.name"), "Luka");
    fill(dialog, t("memberForm.surname"), "Horvat");
    fill(dialog, t("memberForm.birthday"), "2016-06-01");
    fireEvent.click(within(dialog).getByRole("button", { name: t("memberForm.submit") }));

    expect(within(dialog).getByText(t("memberForm.error.guardianRequired", { age: 18 }))).toBeInTheDocument();
  });

  it("saves a member, closes the popup and shows the new row", async () => {
    renderPage();
    await screen.findByRole("rowheader", { name: "Horvat Ana" });
    const dialog = await openDialog();
    fill(dialog, t("memberForm.name"), "Marko");
    fill(dialog, t("memberForm.surname"), "Babić");
    fill(dialog, t("memberForm.birthday"), "1990-05-01");
    fireEvent.click(within(dialog).getByRole("button", { name: t("memberForm.submit") }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/members",
      expect.anything(),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ orgId: "1", name: "Marko", surname: "Babić", birthday: "1990-05-01", guardians: [] }),
      }),
    );
    expect(await screen.findByRole("rowheader", { name: "Babić Marko" })).toBeInTheDocument();
  });
});
