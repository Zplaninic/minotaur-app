import type { SubscriptionResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { Providers } from "../members/testUtils";
import { EditSubscriptionScreen } from "./EditSubscriptionScreen";
import { SubscriptionFormScreen } from "./SubscriptionFormScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }) }));

const fetchMock = jest.mocked(api.fetch);

const kids: SubscriptionResponse = {
  id: "1",
  name: "Kids 2x",
  sessionsPerWeek: 2,
  price: 4550,
  createdAt: "2026-11-16T10:00:00.000Z",
  updatedAt: "2026-11-16T10:00:00.000Z",
};

let sent: { path: string; method: string | undefined; body: unknown } | undefined;
let conflict: boolean;

beforeEach(() => {
  mockBack.mockReset();
  sent = undefined;
  conflict = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (init?.method) {
      if (conflict) {
        throw new ApiError("CONFLICT", 409);
      }
      sent = { path, method: init.method, body: JSON.parse(String(init.body)) };
      return kids;
    }
    if (path === "/subscriptions") {
      return { items: [kids] };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const field = (label: Parameters<typeof t>[0]) => screen.getByLabelText(t(label));

const save = () => fireEvent.press(screen.getByRole("button", { name: t("subscriptionForm.submit") }));

describe("SubscriptionFormScreen", () => {
  const renderAdd = () =>
    render(
      <Providers>
        <SubscriptionFormScreen />
      </Providers>,
    );

  it("shows field errors and sends nothing when the form is empty", async () => {
    await renderAdd();
    await save();

    expect(screen.getByText(t("subscriptionForm.error.name"))).toBeOnTheScreen();
    expect(screen.getByText(t("subscriptionForm.error.sessionsPerWeek"))).toBeOnTheScreen();
    expect(screen.getByText(t("subscriptionForm.error.price"))).toBeOnTheScreen();
    expect(sent).toBeUndefined();
  });

  it("adds a subscription with a price in euros and goes back", async () => {
    await renderAdd();
    await fireEvent.changeText(field("subscriptionForm.name"), "Adults 3x");
    await fireEvent.press(screen.getByRole("radio", { name: "3" }));
    await fireEvent.changeText(field("subscriptionForm.price"), "60,00");
    await save();

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(sent).toEqual({
      path: "/subscriptions",
      method: "POST",
      body: { name: "Adults 3x", sessionsPerWeek: 3, price: 6000 },
    });
  });

  it("shows a taken name next to the name field", async () => {
    conflict = true;
    await renderAdd();
    await fireEvent.changeText(field("subscriptionForm.name"), "Kids 2x");
    await fireEvent.press(screen.getByRole("radio", { name: "2" }));
    await fireEvent.changeText(field("subscriptionForm.price"), "45");
    await save();

    expect(await screen.findByText(t("subscriptionForm.error.nameTaken"))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe("EditSubscriptionScreen", () => {
  it("starts from the current values and saves the changes", async () => {
    await render(
      <Providers>
        <EditSubscriptionScreen subscriptionId="1" />
      </Providers>,
    );
    expect(await screen.findByDisplayValue("Kids 2x")).toBeOnTheScreen();
    expect(field("subscriptionForm.price")).toHaveDisplayValue("45.50");

    await fireEvent.changeText(field("subscriptionForm.price"), "30");
    await save();

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(sent).toEqual({
      path: "/subscriptions/1",
      method: "PUT",
      body: { name: "Kids 2x", sessionsPerWeek: 2, price: 3000 },
    });
  });

  it("says when the subscription does not exist", async () => {
    await render(
      <Providers>
        <EditSubscriptionScreen subscriptionId="99" />
      </Providers>,
    );
    expect(await screen.findByText("We could not find what you were looking for.")).toBeOnTheScreen();
  });
});
