import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, createApiClient, toErrorCode } from "./apiClient.js";

const schema = z.object({ name: z.string() });
const api = createApiClient("/api");

const mockFetch = (response: Response | Error) => {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) {
      throw response;
    }
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiClient", () => {
  it("returns the response parsed with the schema", async () => {
    const fetchMock = mockFetch(Response.json({ name: "a" }));
    await expect(api.fetch("/things", schema)).resolves.toEqual({ name: "a" });
    expect(fetchMock).toHaveBeenCalledWith("/api/things", expect.anything());
  });

  it("throws the API error code for an error response", async () => {
    mockFetch(Response.json({ code: "NOT_FOUND", message: "Not found" }, { status: 404 }));
    await expect(api.fetch("/things", schema)).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("throws UNEXPECTED_RESPONSE when the body does not match the schema", async () => {
    mockFetch(Response.json({ name: 1 }));
    await expect(api.fetch("/things", schema)).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("throws NETWORK_ERROR when the request cannot be made", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    await expect(api.fetch("/things", schema)).rejects.toEqual(new ApiError("NETWORK_ERROR"));
  });
});

describe("toErrorCode", () => {
  it("treats anything that is not an ApiError as an unexpected response", () => {
    expect(toErrorCode(new Error("boom"))).toBe("UNEXPECTED_RESPONSE");
  });
});

describe("createApiClient options", () => {
  it("adds the headers from getHeaders to every request", async () => {
    let sentHeaders: Headers | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        sentHeaders = new Headers(init.headers);
        return Response.json({ name: "a" });
      }),
    );
    const withToken = createApiClient("/api", { getHeaders: async () => ({ Authorization: "Bearer abc" }) });
    await withToken.fetch("/things", schema);
    expect(sentHeaders?.get("Authorization")).toBe("Bearer abc");
  });
});
