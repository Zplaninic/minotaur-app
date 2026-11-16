import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@repo/shared/client";
import { describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { en } from "../lib/locales/en";
import { hr } from "../lib/locales/hr";
import { createAppRouter } from "./router";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

vi.mocked(api.fetch).mockImplementation(async () => {
  throw new ApiError("UNAUTHORIZED", 401);
});

describe("language switcher", () => {
  it("switches the login page to Croatian and back, and remembers the choice", async () => {
    const router = createAppRouter(createMemoryHistory({ initialEntries: ["/login"] }));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: en["login.title"] })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en["language.en"] })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: hr["language.hr"] }));

    expect(await screen.findByRole("heading", { name: hr["login.title"] })).toBeInTheDocument();
    expect(screen.getByLabelText(hr["login.password"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: hr["language.hr"] })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.lang).toBe("hr");
    expect(localStorage.getItem("minotaur.language")).toBe("hr");

    fireEvent.click(screen.getByRole("button", { name: en["language.en"] }));

    expect(await screen.findByRole("heading", { name: en["login.title"] })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });
});
