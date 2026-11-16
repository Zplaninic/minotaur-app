import type { GroupAttendanceResponse, SubscriptionResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { Providers } from "../members/testUtils";
import { MemberSubscriptionScreen } from "./MemberSubscriptionScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }) }));

const fetchMock = jest.mocked(api.fetch);

const subscription = (id: string, name: string, price: number): SubscriptionResponse => ({
  id,
  name,
  sessionsPerWeek: Number(id),
  price,
  createdAt: "2026-11-01T17:00:00.000Z",
  updatedAt: "2026-11-01T17:00:00.000Z",
});

const attendance: GroupAttendanceResponse = {
  sessions: [{ id: "11", date: "2026-11-11" }],
  members: [
    {
      id: "4",
      name: "Leo",
      surname: "Perić",
      attendedSessionIds: [],
      subscription: { id: "1", name: "Kids 1x", sessionsPerWeek: 1, price: 3000 },
      paid: false,
    },
  ],
};

let sentBody: unknown;
let offline: boolean;
let paidMonth: boolean;
let withoutSubscription: boolean;

beforeEach(() => {
  mockBack.mockReset();
  sentBody = undefined;
  offline = false;
  paidMonth = false;
  withoutSubscription = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (offline) {
      throw new ApiError("NETWORK_ERROR");
    }
    if (path === "/groups/1/attendance?month=2026-11") {
      return {
        ...attendance,
        members: attendance.members.map((member) => ({
          ...member,
          paid: paidMonth,
          subscription: withoutSubscription ? null : member.subscription,
        })),
      };
    }
    if (path === "/groups/1/months/2026-11/members/4/paid" && init?.method === "PUT") {
      sentBody = JSON.parse(String(init.body));
      return undefined;
    }
    if (path === "/subscriptions") {
      return { items: [subscription("1", "Kids 1x", 3000), subscription("2", "Kids 2x", 4500)] };
    }
    if (path === "/groups/1/months/2026-11/members/4/subscription" && init?.method === "PUT") {
      if (paidMonth) {
        throw new ApiError("CONFLICT", 409);
      }
      sentBody = JSON.parse(String(init.body));
      return undefined;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderScreen = (memberId = "4") =>
  render(
    <Providers>
      <MemberSubscriptionScreen groupId="1" month="2026-11" memberId={memberId} />
    </Providers>,
  );

describe("MemberSubscriptionScreen", () => {
  it("marks the current subscription and saves a new one", async () => {
    await renderScreen();
    expect(await screen.findByText("Leo Perić in November 2026")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Kids 1x · €30.00" })).toBeChecked();

    await fireEvent.press(screen.getByRole("radio", { name: "Kids 2x · €45.00" }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(sentBody).toEqual({ subscriptionId: "2" });
  });

  it("clears the subscription", async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole("radio", { name: t("attendance.noSubscription") }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(sentBody).toEqual({ subscriptionId: null });
  });

  it("marks the month paid and stays on the screen", async () => {
    await renderScreen();
    const box = await screen.findByRole("checkbox", { name: t("monthSubscriptionForm.paid") });
    expect(box).not.toBeChecked();

    await fireEvent.press(box);

    await waitFor(() => expect(sentBody).toEqual({ paid: true }));
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("explains that a paid month keeps its subscription", async () => {
    paidMonth = true;
    await renderScreen();
    await fireEvent.press(await screen.findByRole("radio", { name: t("attendance.noSubscription") }));

    expect(await screen.findByText(t("monthSubscriptionForm.paidKeepsSubscription"))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("does not mark a month without a subscription paid", async () => {
    withoutSubscription = true;
    await renderScreen();
    await fireEvent.press(await screen.findByRole("checkbox", { name: t("monthSubscriptionForm.paid") }));

    expect(screen.getByText(t("monthSubscriptionForm.paidNeedsSubscription"))).toBeOnTheScreen();
    expect(sentBody).toBeUndefined();
  });

  it("says when the member is not on the month's roster", async () => {
    await renderScreen("99");
    expect(await screen.findByText("We could not find what you were looking for.")).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    offline = true;
    await renderScreen();
    expect(await screen.findByText(t("monthSubscriptionForm.offlineTitle"))).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("common.retry") })).toBeOnTheScreen();
  });
});
