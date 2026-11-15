import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../lib/messages";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("shows the app name as the page heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: t("app.name") })).toBeInTheDocument();
  });
});
