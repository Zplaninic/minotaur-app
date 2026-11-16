import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { i18n } from "../../lib/i18n";
import { storeLanguage } from "../../lib/languageStore";
import { en } from "../../lib/locales/en";
import { hr } from "../../lib/locales/hr";
import { LoginScreen } from "./LoginScreen";

jest.mock("../../api/client", () => ({ api: { fetch: jest.fn() } }));
jest.mock("../../lib/sessionToken", () => ({ clearSessionToken: jest.fn(), saveSessionToken: jest.fn() }));
jest.mock("../../lib/languageStore", () => ({ readStoredLanguage: () => null, storeLanguage: jest.fn() }));

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

afterEach(() => {
  void i18n.changeLanguage("en");
});

describe("language switcher on the login screen", () => {
  it("switches to Croatian and back, and remembers the choice", async () => {
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <SafeAreaProvider initialMetrics={metrics}>
          <LoginScreen />
        </SafeAreaProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("header", { name: en["login.title"] })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: en["language.en"] })).toBeChecked();

    await fireEvent.press(screen.getByRole("radio", { name: hr["language.hr"] }));

    expect(await screen.findByRole("header", { name: hr["login.title"] })).toBeOnTheScreen();
    expect(screen.getByLabelText(hr["login.password"])).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: hr["language.hr"] })).toBeChecked();
    expect(storeLanguage).toHaveBeenCalledWith("hr");

    await fireEvent.press(screen.getByRole("radio", { name: en["language.en"] }));

    expect(await screen.findByRole("header", { name: en["login.title"] })).toBeOnTheScreen();
    expect(storeLanguage).toHaveBeenLastCalledWith("en");
  });
});
