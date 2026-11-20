import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./apiClient.js";
import { fetchMe } from "./auth.js";

const api = createApiClient("/api");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMe", () => {
  it("returns the logged-in member", async () => {
    const me = { memberId: "1", name: "Ana", surname: "Horvat", email: "ana@example.com", role: "admin", org: { id: "1", name: "Club" } };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(me)));
    await expect(fetchMe(api)).resolves.toEqual(me);
  });

  it("returns null when logged out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ code: "UNAUTHORIZED", message: "Log in first" }, { status: 401 })),
    );
    await expect(fetchMe(api)).resolves.toBeNull();
  });
});
