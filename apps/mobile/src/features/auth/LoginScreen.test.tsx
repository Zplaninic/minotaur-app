import { ApiError, authKeys } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "../../api/client";
import { t } from "../../lib/messages";
import { saveSessionToken } from "../../lib/sessionToken";
import { admin } from "../members/testUtils";
import { LoginScreen } from "./LoginScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));

const fetchMock = jest.mocked(api.fetch);

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let queryClient: QueryClient;

beforeEach(() => {
  fetchMock.mockReset();
  jest.mocked(saveSessionToken).mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
});

const renderScreen = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={metrics}>
        <LoginScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );

const fillAndSubmit = async (password: string) => {
  await fireEvent.changeText(screen.getByLabelText(t("login.email")), "Admin@Example.com");
  await fireEvent.changeText(screen.getByLabelText(t("login.password")), password);
  await fireEvent.press(screen.getByRole("button", { name: t("login.submit") }));
};

describe("LoginScreen", () => {
  it("logs in with a token, stores it securely and remembers who is logged in", async () => {
    fetchMock.mockResolvedValue({ me: admin, token: "secret-token", expiresAt: "2026-12-15T00:00:00.000Z" });
    await renderScreen();
    await fillAndSubmit("correct horse battery");

    await waitFor(() => expect(saveSessionToken).toHaveBeenCalledWith("secret-token"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ email: "admin@example.com", password: "correct horse battery", transport: "token" }),
      }),
    );
    await waitFor(() => expect(queryClient.getQueryData(authKeys.me())).toEqual(admin));
  });

  it("shows field errors and sends nothing when the form is empty", async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole("button", { name: t("login.submit") }));

    expect(screen.getByText(t("login.error.email"))).toBeOnTheScreen();
    expect(screen.getByText(t("login.error.password"))).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says when the email or password is wrong", async () => {
    fetchMock.mockRejectedValue(new ApiError("UNAUTHORIZED", 401));
    await renderScreen();
    await fillAndSubmit("wrong password");

    expect(await screen.findByText(t("login.error.credentials"))).toBeOnTheScreen();
    expect(saveSessionToken).not.toHaveBeenCalled();
  });
});
