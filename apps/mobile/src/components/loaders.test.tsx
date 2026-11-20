import { render, screen } from "@testing-library/react-native";
import { Button } from "./Button";
import { SkeletonList } from "./SkeletonList";

describe("loaders", () => {
  it("announces a list that is still loading", async () => {
    await render(<SkeletonList label="Loading members…" />);
    expect(screen.getByLabelText("Loading members…")).toBeOnTheScreen();
  });

  it("disables a pending button and marks it busy", async () => {
    await render(<Button label="Saving…" onPress={jest.fn()} pending />);
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
  });
});
