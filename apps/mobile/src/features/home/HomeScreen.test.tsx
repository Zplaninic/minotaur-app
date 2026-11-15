import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { clearSessionToken } from "../../lib/sessionToken";
import { admin } from "../members/testUtils";
import { HomeScreen } from "./HomeScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

const fetchMock = jest.mocked(api.fetch);

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderScreen = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } })}
    >
      <SafeAreaProvider initialMetrics={metrics}>
        <HomeScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path) => (path === "/me" ? admin : undefined));
});

describe("HomeScreen", () => {
  it("shows the app name, who is logged in, and the members button for an admin", async () => {
    await renderScreen();
    expect(screen.getByRole("header", { name: t("app.name") })).toBeOnTheScreen();
    expect(await screen.findByText(t("home.loggedInAs", { name: "Zvonimir Admin" }))).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: t("home.members") })).toBeOnTheScreen();
  });

  it("logs out and forgets the session token", async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByRole("button", { name: t("home.logout") }));
    await waitFor(() => expect(clearSessionToken).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/auth/logout", expect.anything(), expect.anything());
  });
});
