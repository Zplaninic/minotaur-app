import { ApiError } from "@repo/shared/client";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { EditMemberScreen } from "./EditMemberScreen";
import { ana, Providers } from "./testUtils";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: mockBack }) }));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return { __esModule: true, default: View, DateTimePickerAndroid: { open: jest.fn() } };
});

const fetchMock = jest.mocked(api.fetch);

afterEach(() => {
  jest.restoreAllMocks();
});

// Presses one of the buttons of the last Alert.alert, by its text.
const pressAlertButton = async (text: string) => {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
  await act(() => buttons.find((button) => button.text === text)?.onPress?.());
};


let online: boolean;
let putBody: unknown;

beforeEach(() => {
  mockBack.mockReset();
  online = true;
  putBody = undefined;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (!online) {
      throw new ApiError("NETWORK_ERROR");
    }
    if (path === "/orgs") {
      return { items: [{ id: "1", name: "SPK Minotaur" }] };
    }
    if (path === "/guardians") {
      return { items: ana.guardians };
    }
    if (path === "/members/1" && init?.method === "PUT") {
      putBody = JSON.parse(String(init.body));
      return { ...ana, name: "Anamarija" };
    }
    if (path === "/members/1") {
      return ana;
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderScreen = () =>
  render(
    <Providers>
      <EditMemberScreen memberId="1" />
    </Providers>,
  );

describe("EditMemberScreen", () => {
  it("fills in the member and saves the changes", async () => {
    await renderScreen();
    const name = await screen.findByDisplayValue("Ana");
    await fireEvent.changeText(name, "Anamarija");
    await fireEvent.press(screen.getByRole("button", { name: t("memberForm.saveChanges") }));

    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(putBody).toEqual({
      name: "Anamarija",
      surname: "Horvat",
      birthday: "2014-03-12",
      guardians: [{ kind: "existing", guardianId: "1" }],
    });
  });

  it("removes a guardian from the form only after confirming", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderScreen();
    const remove = await screen.findByRole("button", { name: t("memberForm.guardianRemove", { number: 1 }) });

    await fireEvent.press(remove);
    await pressAlertButton(t("common.cancel"));
    expect(screen.getByRole("button", { name: t("memberForm.guardianRemove", { number: 1 }) })).toBeOnTheScreen();

    await fireEvent.press(remove);
    expect(Alert.alert).toHaveBeenLastCalledWith(
      t("memberForm.guardianRemoveConfirmTitle", { number: 1 }),
      t("memberForm.guardianRemoveConfirmText"),
      expect.anything(),
    );
    await pressAlertButton(t("common.remove"));
    expect(screen.queryByRole("button", { name: t("memberForm.guardianRemove", { number: 1 }) })).not.toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    online = false;
    await renderScreen();
    expect(await screen.findByText(t("memberForm.offlineTitle"))).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("common.retry") })).toBeOnTheScreen();
  });
});
