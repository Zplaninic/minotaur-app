import type { OverduePaymentsResponse, SubscriptionSummaryResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { Providers } from "../members/testUtils";
import { PaymentsScreen } from "./PaymentsScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

const october: SubscriptionSummaryResponse = {
  month: "2026-10",
  members: 3,
  paid: 1,
  unpaid: 2,
  expected: 13500,
  collected: 4500,
  open: 9000,
  bySubscription: [{ id: "1", name: "Kids 2x", members: 3, paid: 1, expected: 13500, collected: 4500 }],
};

let overdue: OverduePaymentsResponse;
let offline: boolean;

beforeEach(() => {
  overdue = { items: [], total: 0 };
  offline = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path) => {
    if (offline) {
      throw new ApiError("NETWORK_ERROR");
    }
    const summary = /^\/subscriptions\/summary\?month=(\d{4}-\d{2})$/.exec(path);
    if (summary) {
      const month = summary[1] ?? "";
      return month === "2026-10"
        ? october
        : { month, members: 0, paid: 0, unpaid: 0, expected: 0, collected: 0, open: 0, bySubscription: [] };
    }
    if (path === "/subscriptions/overdue") {
      return overdue;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderScreen = () =>
  render(
    <Providers>
      <PaymentsScreen now={new Date(2026, 10, 16, 18, 30)} />
    </Providers>,
  );

describe("PaymentsScreen", () => {
  it("shows a month's totals and steps back a month", async () => {
    await renderScreen();
    expect(await screen.findByText(t("payments.empty", { month: "November 2026" }))).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: t("payments.previousMonth") }));

    expect(await screen.findByText("€135.00")).toBeOnTheScreen();
    expect(screen.getByText("€90.00")).toBeOnTheScreen();
    expect(screen.getByText("Kids 2x")).toBeOnTheScreen();
    expect(screen.getByText("1 of 3 paid · €45.00 of €135.00")).toBeOnTheScreen();
  });

  it("does not go further than next month", async () => {
    await renderScreen();
    const next = await screen.findByRole("button", { name: t("payments.nextMonth") });
    await fireEvent.press(next);
    expect(await screen.findByText("December 2026")).toBeOnTheScreen();
    expect(next).toBeDisabled();
  });

  it("lists members who have not paid a past month", async () => {
    overdue = {
      items: [
        {
          id: "4",
          name: "Leo",
          surname: "Perić",
          months: [{ month: "2026-10", subscription: { id: "1", name: "Kids 2x" }, price: 4500 }],
          total: 4500,
        },
      ],
      total: 4500,
    };
    await renderScreen();
    expect(await screen.findByText("Leo Perić")).toBeOnTheScreen();
    expect(screen.getByText("October 2026: Kids 2x, €45.00")).toBeOnTheScreen();
    expect(screen.getByText(t("overdue.total", { total: "€45.00" }))).toBeOnTheScreen();
  });

  it("says when everyone has paid", async () => {
    await renderScreen();
    expect(await screen.findByText(t("overdue.empty"))).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    offline = true;
    await renderScreen();
    expect((await screen.findAllByText(t("payments.offlineTitle"))).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: t("common.retry") }).length).toBeGreaterThan(0);
  });
});
