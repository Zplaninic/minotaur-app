import { describe, expect, it } from "vitest";
import { safeRedirect } from "./redirect";

describe("safeRedirect", () => {
  it("keeps a path inside the app", () => {
    expect(safeRedirect("/members?page=2")).toBe("/members?page=2");
  });

  it.each([undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "/login?redirect=%2F"])(
    "falls back to the start page for %s",
    (value) => {
      expect(safeRedirect(value)).toBe("/");
    },
  );
});
