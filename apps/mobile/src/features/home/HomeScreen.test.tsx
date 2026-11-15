import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { t } from "../../lib/messages";
import { HomeScreen } from "./HomeScreen";

const metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("HomeScreen", () => {
  it("shows the app name as the screen heading", async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <HomeScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole("header", { name: t("app.name") })).toBeOnTheScreen();
  });
});
