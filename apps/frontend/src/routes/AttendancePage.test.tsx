import type { GroupAttendanceResponse, GroupResponse, MeResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { t } from "../lib/messages";
import { createAppRouter } from "./router";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const trainer: MeResponse = { memberId: "9", name: "Ana", surname: "Trener", email: "ana@example.com", role: "trainer" };

const group: GroupResponse = {
  id: "1",
  owner: { id: "9", name: "Ana", surname: "Trener" },
  days: ["monday", "wednesday"],
  from: "18:00",
  to: "19:00",
  memberCount: 2,
  createdAt: "2026-11-01T17:00:00.000Z",
  updatedAt: "2026-11-01T17:00:00.000Z",
};

const november = (): GroupAttendanceResponse => ({
  sessions: [
    { id: "11", date: "2026-11-11" },
    { id: "16", date: "2026-11-16" },
    { id: "18", date: "2026-11-18" },
  ],
  members: [
    { id: "4", name: "Leo", surname: "Perić", attendedSessionIds: ["11"] },
    { id: "5", name: "Nora", surname: "Jurić", attendedSessionIds: [] },
  ],
});

let attendance: GroupAttendanceResponse;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 16, 18, 30));
  attendance = november();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return trainer;
    }
    if (path === "/groups/1") {
      return group;
    }
    if (path === "/groups/1/attendance?month=2026-11") {
      return attendance;
    }
    if (path === "/groups/1/attendance?month=2026-09") {
      return { sessions: [], members: [] };
    }
    const tick = /^\/groups\/1\/sessions\/(\d+)\/attendance\/(\d+)$/.exec(path);
    if (tick) {
      const [, sessionId = "", memberId = ""] = tick;
      attendance = {
        ...attendance,
        members: attendance.members.map((member) =>
          member.id === memberId
            ? {
                ...member,
                attendedSessionIds:
                  init?.method === "PUT"
                    ? [...member.attendedSessionIds, sessionId]
                    : member.attendedSessionIds.filter((id) => id !== sessionId),
              }
            : member,
        ),
      };
      return undefined;
    }
    if (path === "/groups/1/sessions/month" && init?.method === "POST") {
      attendance = november();
      return undefined;
    }
    if (path === "/groups/1/members") {
      return {
        items: [
          { id: "4", name: "Leo", surname: "Perić", birthday: "2020-03-12", email: null, phone: null, guardians: [] },
          { id: "5", name: "Nora", surname: "Jurić", birthday: "2020-05-01", email: null, phone: null, guardians: [] },
          { id: "6", name: "Mia", surname: "Novak", birthday: "2019-09-09", email: null, phone: null, guardians: [] },
        ],
      };
    }
    const monthMember = /^\/groups\/1\/months\/2026-11\/members\/(\d+)$/.exec(path);
    if (monthMember) {
      const [, memberId = ""] = monthMember;
      attendance = {
        ...attendance,
        members:
          init?.method === "PUT"
            ? [...attendance.members, { id: memberId, name: "Mia", surname: "Novak", attendedSessionIds: [] }]
            : attendance.members.filter((member) => member.id !== memberId),
      };
      return undefined;
    }
    if (path === "/groups/1/sessions/18" && init?.method === "DELETE") {
      attendance = { ...attendance, sessions: attendance.sessions.filter((session) => session.id !== "18") };
      return undefined;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.style.removeProperty("--breakpoint-narrow");
  vi.unstubAllGlobals();
});

const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={createAppRouter(createMemoryHistory({ initialEntries: [path] }))} />
    </QueryClientProvider>,
  );

const box = (name: string, date: string) =>
  screen.findByRole("checkbox", { name: t("attendance.checkboxLabel", { name, date }) });

describe("AttendancePage, wide screens", () => {
  it("shows the month as a grid and ticks a member", async () => {
    renderAt("/groups/1/attendance?month=2026-11");
    expect(await screen.findByText("November 2026")).toBeInTheDocument();
    expect(await box("Leo Perić", "Wed, Nov 11")).toBeChecked();

    const today = await box("Nora Jurić", "Mon, Nov 16");
    expect(today).not.toBeChecked();
    fireEvent.click(today);

    await waitFor(() => expect(today).toBeChecked());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/sessions/16/attendance/5",
      expect.anything(),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("disables future sessions", async () => {
    renderAt("/groups/1/attendance?month=2026-11");
    expect(await box("Leo Perić", "Wed, Nov 18")).toBeDisabled();
    expect(screen.getByText(t("attendance.futureHint"))).toBeInTheDocument();
  });

  it("offers to delete only sessions nobody attended", async () => {
    renderAt("/groups/1/attendance?month=2026-11");
    await box("Leo Perić", "Wed, Nov 11");
    expect(
      screen.queryByRole("button", { name: t("attendance.deleteSessionLabel", { date: "Wed, Nov 11" }) }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t("attendance.deleteSessionLabel", { date: "Wed, Nov 18" }) }));
    const confirm = screen.getByRole("dialog", {
      name: t("attendance.deleteSessionConfirmTitle", { date: "Wed, Nov 18" }),
    });
    fireEvent.click(within(confirm).getByRole("button", { name: t("common.delete") }));
    await waitFor(() => expect(screen.queryByRole("columnheader", { name: /Nov 18/ })).not.toBeInTheDocument());
  });

  it("adds a group member to the month and removes a member without ticks", async () => {
    renderAt("/groups/1/attendance?month=2026-11");
    await box("Leo Perić", "Wed, Nov 11");
    expect(
      screen.queryByRole("button", { name: t("attendance.removeMemberLabel", { name: "Leo Perić", month: "November 2026" }) }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t("attendance.addMember") }));
    const dialog = screen.getByRole("dialog", { name: t("monthMemberForm.title") });
    const select = await within(dialog).findByLabelText(t("monthMemberForm.member"));
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      t("monthMemberForm.memberPlaceholder"),
      "Novak Mia",
    ]);
    fireEvent.change(select, { target: { value: "6" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t("monthMemberForm.submit") }));
    expect(await box("Mia Novak", "Wed, Nov 11")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: t("attendance.removeMemberLabel", { name: "Mia Novak", month: "November 2026" }) }),
    );
    const confirm = screen.getByRole("dialog", {
      name: t("attendance.removeMemberConfirmTitle", { name: "Mia Novak", month: "November 2026" }),
    });
    fireEvent.click(within(confirm).getByRole("button", { name: t("common.remove") }));
    await waitFor(() =>
      expect(
        screen.queryByRole("checkbox", { name: t("attendance.checkboxLabel", { name: "Mia Novak", date: "Wed, Nov 11" }) }),
      ).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/months/2026-11/members/6",
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("creates the sessions of an empty month", async () => {
    attendance = { sessions: [], members: november().members };
    renderAt("/groups/1/attendance?month=2026-11");
    fireEvent.click(
      await screen.findByRole("button", { name: t("attendance.createSessions", { days: "Monday, Wednesday" }) }),
    );

    expect(await box("Leo Perić", "Wed, Nov 11")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/sessions/month",
      expect.anything(),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ month: "2026-11" }) }),
    );
  });

  it("explains that sessions cannot be created for an earlier month", async () => {
    renderAt("/groups/1/attendance?month=2026-09");
    expect(await screen.findByText(t("attendance.createOnlyNearMonths"))).toBeInTheDocument();
    // September 2026 is the first month: nothing before it.
    expect(screen.getByRole("button", { name: t("attendance.previousMonth") })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Create sessions/ })).not.toBeInTheDocument();
  });

  it("only adds sessions in the current or next month", async () => {
    renderAt("/groups/1/attendance?month=2026-11");
    fireEvent.click(await screen.findByRole("button", { name: t("attendance.addSession") }));
    const dialog = screen.getByRole("dialog", { name: t("sessionForm.title") });
    const input = within(dialog).getByLabelText(t("sessionForm.date"));
    expect(input).toHaveAttribute("min", "2026-11-01");
    expect(input).toHaveAttribute("max", "2026-12-31");

    fireEvent.change(input, { target: { value: "2026-10-20" } });
    fireEvent.click(within(dialog).getByRole("button", { name: t("sessionForm.submit") }));
    expect(within(dialog).getByText(t("sessionForm.error.range"))).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/groups/1/sessions", expect.anything(), expect.anything());
  });

  it("opens the current month instead of one before September 2026", async () => {
    renderAt("/groups/1/attendance?month=2026-08");
    expect(await screen.findByText("November 2026")).toBeInTheDocument();
  });

  it("shows an error when the month cannot be loaded", async () => {
    renderAt("/groups/77/attendance?month=2026-11");
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not find what you were looking for.");
  });
});

describe("AttendancePage, phones", () => {
  beforeEach(() => {
    document.documentElement.style.setProperty("--breakpoint-narrow", "48rem");
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: query === "(width < 48rem)",
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
  });

  it("opens today's session as a checklist and steps between sessions", async () => {
    renderAt("/groups/1/attendance?month=2026-11");
    const nav = await screen.findByRole("navigation", { name: t("attendance.sessionNav") });
    expect(await within(nav).findByText("Mon, Nov 16")).toBeInTheDocument();

    const row = await screen.findByRole("checkbox", { name: "Jurić Nora" });
    fireEvent.click(row);
    await waitFor(() => expect(row).toBeChecked());
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/sessions/16/attendance/5",
      expect.anything(),
      expect.objectContaining({ method: "PUT" }),
    );

    fireEvent.click(within(nav).getByRole("button", { name: t("attendance.previousSession") }));
    expect(within(nav).getByText("Wed, Nov 11")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Perić Leo" })).toBeChecked();
  });
});
