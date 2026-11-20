import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { LoadingState } from "./LoadingState";
import { TableSkeleton } from "./TableSkeleton";

describe("loaders", () => {
  it("announces a table that is still loading", () => {
    render(<TableSkeleton label="Loading members…" columns={5} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading members…");
  });

  it("announces a section that is still loading", () => {
    render(<LoadingState label="Loading the group…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the group…");
  });

  it("disables a pending button and marks it busy", () => {
    render(<Button pending>Saving…</Button>);
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
