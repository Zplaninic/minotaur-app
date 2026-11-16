import { errorResponse } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { errorResponses, guardedErrorResponses } from "./responses.js";

describe("errorResponses", () => {
  it("maps exactly the given statuses to the shared errorResponse", () => {
    expect(errorResponses(400, 429)).toEqual({ 400: errorResponse, 429: errorResponse });
  });
});

describe("guardedErrorResponses", () => {
  it("always adds 401, 403 and 500", () => {
    expect(Object.keys(guardedErrorResponses()).map(Number).toSorted()).toEqual([401, 403, 500]);
    expect(Object.keys(guardedErrorResponses(404, 409)).map(Number).toSorted()).toEqual([401, 403, 404, 409, 500]);
  });
});
