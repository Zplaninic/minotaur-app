import type { MemberResponse } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "../api/client";
import { t } from "../lib/messages";
import { MembersPage } from "./MembersPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  apiFetch: vi.fn(),
}));

const fetchMock = vi.mocked(apiFetch);

const ana: MemberResponse = {
  id: "1",
  orgId: "1",
  name: "Ana",
  surname: "Horvat",
  birthday: "2014-03-12",
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
  fireEvent.click(screen.getByRole("button", { name: t("members.add") }));
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
