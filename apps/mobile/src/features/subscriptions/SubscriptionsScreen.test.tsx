import type { SubscriptionResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { admin, Providers } from "../members/testUtils";
import { SubscriptionsScreen } from "./SubscriptionsScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

const kids: SubscriptionResponse = {
  id: "1",
  name: "Kids 2x",
  sessionsPerWeek: 2,
  price: 4550,
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
};

// Answers /me with the given member and /subscriptions with the given result.
const answer = (me: typeof admin, result: () => Promise<unknown>) =>
  fetchMock.mockImplementation((path) => (path === "/me" ? Promise.resolve(me) : result()));

beforeEach(() => {
  fetchMock.mockReset();
  mockPush.mockReset();
});

const renderScreen = () =>
  render(
    <Providers>
      <SubscriptionsScreen />
    </Providers>,
  );

describe("SubscriptionsScreen", () => {
  it("lists subscriptions with sessions per week and price", async () => {
    answer(admin, async () => ({ items: [kids] }));
    await renderScreen();
    expect(await screen.findByText("Kids 2x")).toBeOnTheScreen();
    expect(screen.getByText("2 per week · €45.50")).toBeOnTheScreen();
  });

  it("shows the empty state when there are no subscriptions", async () => {
    answer(admin, async () => ({ items: [] }));
    await renderScreen();
    expect(await screen.findByText(t("subscriptions.empty"))).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    answer(admin, async () => {
      throw new ApiError("NETWORK_ERROR", 0);
    });
    await renderScreen();
    expect(await screen.findByText(t("subscriptions.offlineTitle"))).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("common.retry") })).toBeOnTheScreen();
  });

  it("lets an admin add and edit subscriptions", async () => {
    answer(admin, async () => ({ items: [kids] }));
    await renderScreen();

    await fireEvent.press(await screen.findByRole("button", { name: t("subscriptions.editLabel", { name: "Kids 2x" }) }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/subscriptions/[id]/edit", params: { id: "1" } });

    await fireEvent.press(screen.getByRole("button", { name: t("subscriptions.add") }));
    expect(mockPush).toHaveBeenCalledWith("/subscriptions/new");

    await fireEvent.press(screen.getByRole("button", { name: t("subscriptions.payments") }));
    expect(mockPush).toHaveBeenCalledWith("/subscriptions/payments");
  });
});
