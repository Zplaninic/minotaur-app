import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { ana, Providers } from "../members/testUtils";
import { AddGroupScreen } from "./AddGroupScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }) }));

// The native picker cannot run in tests; this stand-in passes its props through,
// so a test can fire the picker's onChange directly.
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { __esModule: true, default: View, DateTimePickerAndroid: { open: jest.fn() } };
});

const fetchMock = jest.mocked(api.fetch);

const petra = { ...ana, id: "2", name: "Petra", surname: "Kovač", birthday: "1990-05-01", role: "trainer", guardians: [] };

let postedBody: unknown;

beforeEach(() => {
  mockBack.mockReset();
  postedBody = undefined;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path.startsWith("/members?role=trainer")) {
      return { items: [petra], page: 1, pageSize: 100, total: 1 };
    }
    if (path === "/groups" && init?.method === "POST") {
      postedBody = JSON.parse(String(init.body));
      return {};
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderScreen = async () => {
  await render(
    <Providers>
      <AddGroupScreen />
    </Providers>,
  );
  await screen.findByRole("radio", { name: "Petra Kovač" });
};

const pickTime = async (label: string, testID: string, hours: number, minutes: number) => {
  await fireEvent.press(screen.getByRole("button", { name: new RegExp(`^${label},`) }));
  await fireEvent(screen.getByTestId(testID), "change", { type: "set" }, new Date(2026, 0, 1, hours, minutes));
};

const save = () => fireEvent.press(screen.getByRole("button", { name: t("groupForm.submit") }));

describe("AddGroupScreen", () => {
  it("shows field errors and sends nothing when the form is empty", async () => {
    await renderScreen();
    await save();

    expect(screen.getByText(t("groupForm.error.owner"))).toBeOnTheScreen();
    expect(screen.getByText(t("groupForm.error.days"))).toBeOnTheScreen();
    expect(screen.getByText(t("groupForm.error.from"))).toBeOnTheScreen();
    expect(screen.getByText(t("groupForm.error.to"))).toBeOnTheScreen();
    expect(postedBody).toBeUndefined();
  });

  it("asks for an end time after the start time", async () => {
    await renderScreen();
    await pickTime(t("groupForm.from"), "from-picker", 10, 0);
    await pickTime(t("groupForm.to"), "to-picker", 9, 0);
    await save();

    expect(screen.getByText(t("groupForm.error.timeOrder"))).toBeOnTheScreen();
    expect(postedBody).toBeUndefined();
  });

  it("asks for an upper age that is not below the lower age", async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText(t("groupForm.ageFrom")), "10");
    await fireEvent.changeText(screen.getByLabelText(t("groupForm.ageTo")), "7");
    await save();

    expect(screen.getByText(t("groupForm.error.ageOrder"))).toBeOnTheScreen();
    expect(postedBody).toBeUndefined();
  });

  it("asks for a member limit from 1 to 999", async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText(t("groupForm.maxMembers")), "0");
    await save();

    expect(screen.getByText(t("groupForm.error.maxMembers"))).toBeOnTheScreen();
    expect(postedBody).toBeUndefined();
  });

  it("saves a group and goes back to the list", async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole("radio", { name: "Petra Kovač" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: t("weekday.friday") }));
    await fireEvent.press(screen.getByRole("checkbox", { name: t("weekday.monday") }));
    await pickTime(t("groupForm.from"), "from-picker", 17, 0);
    await pickTime(t("groupForm.to"), "to-picker", 18, 30);
    await fireEvent.changeText(screen.getByLabelText(t("groupForm.ageFrom")), "7");
    await fireEvent.changeText(screen.getByLabelText(t("groupForm.ageTo")), "10");
    await fireEvent.changeText(screen.getByLabelText(t("groupForm.maxMembers")), "12");
    await save();

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(postedBody).toEqual({
      ownerId: "2",
      days: ["monday", "friday"],
      from: "17:00",
      to: "18:30",
      ageFrom: 7,
      ageTo: 10,
      maxMembers: 12,
    });
  });
});
