import { z } from "zod";
import { ApiError, apiFetch } from "./client";

const schema = z.object({ name: z.string() });

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe("apiFetch", () => {
  it("returns the response parsed with the schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ name: "a" }));
    await expect(apiFetch("/things", schema)).resolves.toEqual({ name: "a" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${process.env.EXPO_PUBLIC_API_URL}/things`);
  });

  it("throws the API error code for an error response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: "NOT_FOUND", message: "Not found" }, 404));
    await expect(apiFetch("/things", schema)).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("throws UNEXPECTED_RESPONSE when the body does not match the schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ name: 1 }));
    await expect(apiFetch("/things", schema)).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("throws NETWORK_ERROR when the request cannot be made", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await expect(apiFetch("/things", schema)).rejects.toEqual(new ApiError("NETWORK_ERROR"));
  });
});
