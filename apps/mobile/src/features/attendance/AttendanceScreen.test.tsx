import type { GroupAttendanceResponse, GroupResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { admin } from "../members/testUtils";
import { AttendanceScreen } from "./AttendanceScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

const group: GroupResponse = {
  id: "1",
  owner: { id: "2", name: "Petra", surname: "Kovač" },
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
    { id: "4", name: "Leo", surname: "Perić", attendedSessionIds: ["11"], subscription: null, paid: false },
    { id: "5", name: "Nora", surname: "Jurić", attendedSessionIds: [], subscription: null, paid: false },
  ],
});

const MONTH = "/groups/1/attendance?month=2026-11";

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let attendance: GroupAttendanceResponse;
let online: boolean;

beforeEach(() => {
  attendance = november();
  online = true;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      return admin;
    }
    if (!online) {
      throw new ApiError("NETWORK_ERROR");
    }
    if (path === "/groups/1") {
      return group;
    }
    if (path === "/subscriptions/overdue") {
      return {
        items: [
          {
            id: "5",
            name: "Nora",
            surname: "Jurić",
            months: [{ month: "2026-10", subscription: { id: "1", name: "Kids 1x" }, price: 3000 }],
            total: 3000,
          },
        ],
        total: 3000,
      };
    }
    if (path === MONTH) {
      return attendance;
    }
    if (path === "/groups/1/sessions/16/attendance/5" && init?.method === "PUT") {
      attendance = {
        ...attendance,
        members: attendance.members.map((member) =>
          member.id === "5" ? { ...member, attendedSessionIds: ["16"] } : member,
        ),
      };
      return undefined;
    }
    if (path === "/groups/1/attendance?month=2026-09") {
      return { sessions: [{ id: "2", date: "2026-09-02" }], members: november().members };
    }
    if (path === "/groups/1/attendance?month=2026-10") {
      return { sessions: [], members: [] };
    }
    if (path === "/groups/1/sessions/month" && init?.method === "POST") {
      attendance = november();
      return undefined;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

let queryClient: QueryClient;

// A write refetches the month and settles after that. Waiting until no write
// is in flight keeps updates from landing after the test ends.
const writesSettled = () => waitFor(() => expect(queryClient.isMutating()).toBe(0));

const renderScreen = (now = new Date(2026, 10, 16, 18, 30)) => {
  // gcTime Infinity: a garbage-collection timer would keep Jest from exiting.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={metrics}>
        <AttendanceScreen groupId="1" now={now} />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
};

describe("AttendanceScreen", () => {
  it("opens today's session and ticks a member", async () => {
    await renderScreen();
    expect(await screen.findByText("Mon, Nov 16")).toBeOnTheScreen();

    fireEvent.press(await screen.findByRole("checkbox", { name: "Jurić Nora" }));

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Jurić Nora" })).toBeChecked(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/sessions/16/attendance/5",
      expect.anything(),
      expect.objectContaining({ method: "PUT" }),
    );
    await writesSettled();
  });

  it("steps to the previous session", async () => {
    await renderScreen();
    await screen.findByText("Mon, Nov 16");
    fireEvent.press(screen.getByRole("button", { name: t("attendance.previousSession") }));

    expect(await screen.findByText("Wed, Nov 11")).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Perić Leo" })).toBeChecked();
  });

  it("disables a future session", async () => {
    await renderScreen();
    await screen.findByText("Mon, Nov 16");
    fireEvent.press(screen.getByRole("button", { name: t("attendance.nextSession") }));

    expect(await screen.findByText("Wed, Nov 18")).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Perić Leo" })).toBeDisabled();
    expect(screen.getByText(t("attendance.futureHint"))).toBeOnTheScreen();
  });

  it("creates the sessions of an empty month", async () => {
    attendance = { sessions: [], members: november().members };
    await renderScreen();
    fireEvent.press(
      await screen.findByRole("button", { name: t("attendance.createSessions", { days: "Monday, Wednesday" }) }),
    );

    expect(await screen.findByText("Mon, Nov 16")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledWith(
      "/groups/1/sessions/month",
      expect.anything(),
      expect.objectContaining({ method: "POST" }),
    );
    await writesSettled();
  });

  it("explains that sessions cannot be created for an earlier month", async () => {
    attendance = { sessions: [], members: november().members };
    await renderScreen();
    await screen.findByText(t("attendance.noSessions", { month: "November 2026" }));
    fireEvent.press(screen.getByRole("button", { name: t("attendance.previousSession") }));

    expect(await screen.findByText(t("attendance.createOnlyNearMonths"))).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Create sessions/ })).not.toBeOnTheScreen();
  });

  it("does not go back past the first session of September 2026", async () => {
    await renderScreen(new Date(2026, 8, 10, 18, 30));
    expect(await screen.findByText("Wed, Sep 2")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("attendance.previousSession") })).toBeDisabled();
  });

  it("opens the list of members to add to this month", async () => {
    await renderScreen();
    fireEvent.press(await screen.findByRole("button", { name: t("attendance.addMember") }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]/add-month-member",
      params: { id: "1", month: "2026-11" },
    });
  });

  it("shows each member's subscription and opens the picker", async () => {
    attendance = {
      ...attendance,
      members: attendance.members.map((member) =>
        member.id === "4"
          ? { ...member, subscription: { id: "1", name: "Kids 1x", sessionsPerWeek: 1, price: 3000 }, paid: true }
          : member,
      ),
    };
    await renderScreen();
    expect(await screen.findByText("Kids 1x · Paid")).toBeOnTheScreen();
    expect(screen.getByText("No subscription · Not paid")).toBeOnTheScreen();

    fireEvent.press(
      screen.getByRole("button", {
        name: t("attendance.changeSubscriptionLabel", { name: "Nora Jurić", month: "November 2026" }),
      }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/groups/[id]/member-subscription",
      params: { id: "1", month: "2026-11", memberId: "5" },
    });
  });

  it("marks members who have not paid a past month", async () => {
    await renderScreen();
    expect(await screen.findByText(t("overdue.badge", { months: "Oct 2026" }))).toBeOnTheScreen();
    expect(screen.getAllByText(/^Unpaid:/)).toHaveLength(1);
  });

  it("shows the no-connection state with a retry button", async () => {
    online = false;
    await renderScreen();
    expect(await screen.findByText(t("attendance.offlineTitle"))).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("common.retry") })).toBeOnTheScreen();
  });
});
