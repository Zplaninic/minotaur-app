import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE, errorResponse, id, paginatedResponse, paginationQuery } from "./common.js";

describe("id", () => {
  it("accepts a non-empty string", () => {
    expect(id.parse("abc")).toBe("abc");
  });

  it("rejects an empty string", () => {
    expect(id.safeParse("").success).toBe(false);
  });
});

describe("paginationQuery", () => {
  it("applies defaults", () => {
    expect(paginationQuery.parse({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it("coerces query string values", () => {
    expect(paginationQuery.parse({ page: "2", pageSize: "50" })).toEqual({ page: 2, pageSize: 50 });
  });

  it("rejects a page size above the maximum", () => {
    expect(paginationQuery.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});

describe("paginatedResponse", () => {
  it("wraps an item schema", () => {
    const schema = paginatedResponse(z.object({ id }));
    const value = { items: [{ id: "a" }], page: 1, pageSize: 20, total: 1 };
    expect(schema.parse(value)).toEqual(value);
  });
});

describe("errorResponse", () => {
  it("accepts a known code", () => {
    expect(errorResponse.safeParse({ code: "NOT_FOUND", message: "Not found" }).success).toBe(true);
  });

  it("rejects an unknown code", () => {
    expect(errorResponse.safeParse({ code: "NOPE", message: "x" }).success).toBe(false);
  });
});
