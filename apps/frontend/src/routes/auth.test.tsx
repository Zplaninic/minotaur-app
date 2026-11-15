import type { MeResponse } from "@repo/shared";
import { ApiError } from "@repo/shared/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { t } from "../lib/messages";
import { createAppRouter } from "./router";

vi.mock("../api/client", () => ({ api: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(api.fetch);

const admin: MeResponse = { memberId: "9", name: "Zvonimir", surname: "Admin", email: "admin@example.com", role: "admin" };

let loggedIn: boolean;

beforeEach(() => {
  loggedIn = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (path, _schema, init) => {
    if (path === "/me") {
      if (!loggedIn) {
        throw new ApiError("UNAUTHORIZED", 401);
      }
      return admin;
    }
    if (path === "/auth/login") {
      const body = JSON.parse(String(init?.body)) as { password: string };
      if (body.password !== "correct horse battery") {
        throw new ApiError("UNAUTHORIZED", 401);
      }
      loggedIn = true;
      return { me: admin };
    }
    if (path === "/auth/logout") {
      loggedIn = false;
      return undefined;
    }
    if (path.startsWith("/members?")) {
      return { items: [], page: 1, pageSize: 20, total: 0 };
    }
    throw new ApiError("NOT_FOUND", 404);
  });
});

const renderAt = (path: string) => {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

const fillAndSubmit = (password: string) => {
  fireEvent.change(screen.getByLabelText(t("login.email")), { target: { value: "Admin@Example.com" } });
  fireEvent.change(screen.getByLabelText(t("login.password")), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: t("login.submit") }));
};

describe("login", () => {
  it("sends a logged-out visitor to the login page, then back to where they wanted to go", async () => {
    const router = renderAt("/members");
    expect(await screen.findByRole("heading", { name: t("login.title") })).toBeInTheDocument();

    fillAndSubmit("correct horse battery");

    expect(await screen.findByRole("heading", { name: t("members.title") })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/members");
    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ email: "admin@example.com", password: "correct horse battery", transport: "cookie" }),
      }),
    );
  });

  it("shows field errors and sends nothing when the form is empty", async () => {
    renderAt("/login");
    fireEvent.click(await screen.findByRole("button", { name: t("login.submit") }));

    expect(screen.getByText(t("login.error.email"))).toBeInTheDocument();
    expect(screen.getByText(t("login.error.password"))).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/auth/login", expect.anything(), expect.anything());
  });

  it("says when the email or password is wrong", async () => {
    renderAt("/login");
    await screen.findByRole("heading", { name: t("login.title") });
    fillAndSubmit("wrong password");
    expect(await screen.findByRole("alert")).toHaveTextContent(t("login.error.credentials"));
  });

  it("logs out and returns to the login page", async () => {
    loggedIn = true;
    renderAt("/");
    fireEvent.click(await screen.findByRole("button", { name: t("nav.logout") }));
    expect(await screen.findByRole("heading", { name: t("login.title") })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/auth/logout", expect.anything(), expect.anything()));
  });
});
