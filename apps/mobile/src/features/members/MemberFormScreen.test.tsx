import { ADULT_AGE } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../api/client";
import { translate as t } from "../../lib/messages";
import { MemberFormScreen } from "./MemberFormScreen";
import { iva, Providers } from "./testUtils";

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

let postedBody: unknown;

beforeEach(() => {
  mockBack.mockReset();
  postedBody = undefined;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/orgs") {
      return { items: [{ id: "1", name: "SPK Minotaur" }] };
    }
    if (path === "/guardians") {
      return { items: [iva] };
    }
    if (path === "/members" && init?.method === "POST") {
      postedBody = JSON.parse(String(init.body));
      return { ...JSON.parse(String(init.body)), id: "9", taxNumber: null, email: null, phone: null, guardians: [] };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderScreen = async () => {
  await render(
    <Providers>
      <MemberFormScreen />
    </Providers>,
  );
  await screen.findByLabelText(t("memberForm.name"));
};

const type = (label: string, value: string) => fireEvent.changeText(screen.getByLabelText(label), value);

const pickBirthday = async (date: Date) => {
  await fireEvent.press(screen.getByRole("button", { name: new RegExp(`^${t("memberForm.birthday")},`) }));
  await fireEvent(screen.getByTestId("birthday-picker"), "change", { type: "set" }, date);
};

const save = () => fireEvent.press(screen.getByRole("button", { name: t("memberForm.submit") }));

describe("MemberFormScreen", () => {
  it("shows field errors and sends nothing when required fields are missing", async () => {
    await renderScreen();
    await save();

    expect(screen.getByText(t("memberForm.error.name"))).toBeOnTheScreen();
    expect(screen.queryByText(t("memberForm.error.birthday"))).not.toBeOnTheScreen();
    expect(postedBody).toBeUndefined();
  });

  it("asks for a guardian when the member is a minor", async () => {
    await renderScreen();
    await type(t("memberForm.name"), "Luka");
    await type(t("memberForm.surname"), "Horvat");
    await pickBirthday(new Date(2016, 5, 1));
    await save();

    expect(screen.getByText(t("memberForm.error.guardianRequired", { age: ADULT_AGE }))).toBeOnTheScreen();
    expect(postedBody).toBeUndefined();
  });

  it("saves a member without a birthday after removing the chosen one", async () => {
    await renderScreen();
    await type(t("memberForm.name"), "Marko");
    await type(t("memberForm.surname"), "Babić");
    await pickBirthday(new Date(2016, 5, 1));
    await fireEvent.press(screen.getByRole("button", { name: `${t("common.remove")}: ${t("memberForm.birthday")}` }));
    await save();

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(postedBody).toEqual({ orgId: "1", name: "Marko", surname: "Babić", guardians: [] });
  });

  it("saves a minor with an existing guardian and goes back to the list", async () => {
    await renderScreen();
    await type(t("memberForm.name"), "Luka");
    await type(t("memberForm.surname"), "Horvat");
    await pickBirthday(new Date(2016, 5, 1));
    await fireEvent.press(screen.getByRole("button", { name: t("memberForm.guardianAdd") }));
    await fireEvent.press(screen.getByRole("radio", { name: t("memberForm.guardianExisting") }));
    await fireEvent.press(await screen.findByRole("radio", { name: "Horvat Iva" }));
    await save();

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(postedBody).toEqual({
      orgId: "1",
      name: "Luka",
      surname: "Horvat",
      birthday: "2016-06-01",
      guardians: [{ kind: "existing", guardianId: "1" }],
    });
  });
});
