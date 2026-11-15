import { ApiError } from "@repo/shared/client";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { MembersScreen } from "./MembersScreen";
import { ana, Providers } from "./testUtils";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

beforeEach(() => {
  fetchMock.mockReset();
  mockPush.mockReset();
});

const renderScreen = () =>
  render(
    <Providers>
      <MembersScreen />
    </Providers>,
  );

describe("MembersScreen", () => {
  it("lists members with their guardians", async () => {
    fetchMock.mockResolvedValue({ items: [ana], page: 1, pageSize: 20, total: 1 });
    await renderScreen();
    expect(await screen.findByText("Horvat Ana")).toBeOnTheScreen();
    expect(screen.getByText(t("members.guardians", { names: "Iva Horvat" }))).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledWith("/members?page=1&pageSize=20", expect.anything());
  });

  it("shows the empty state when there are no members", async () => {
    fetchMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    await renderScreen();
    expect(await screen.findByText(t("members.empty"))).toBeOnTheScreen();
  });

  it("shows the no-connection state with a retry button", async () => {
    fetchMock.mockRejectedValueOnce(new ApiError("NETWORK_ERROR"));
    await renderScreen();
    expect(await screen.findByText(t("members.offlineTitle"))).toBeOnTheScreen();

    fetchMock.mockResolvedValue({ items: [ana], page: 1, pageSize: 20, total: 1 });
    await fireEvent.press(screen.getByRole("button", { name: t("common.retry") }));
    expect(await screen.findByText("Horvat Ana")).toBeOnTheScreen();
  });

  it("opens the add-member screen", async () => {
    fetchMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    await renderScreen();
    await fireEvent.press(screen.getByRole("button", { name: t("members.add") }));
    expect(mockPush).toHaveBeenCalledWith("/members/new");
  });
});
