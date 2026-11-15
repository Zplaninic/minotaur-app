import { describe, expect, it } from "vitest";
import { ageOn, fromIsoDate, toIsoDate } from "./age.js";

const today = new Date(2026, 10, 15);

describe("ageOn", () => {
  it("counts a birthday later this year as not yet reached", () => {
    expect(ageOn("2008-11-16", today)).toBe(17);
  });

  it("counts a birthday today as reached", () => {
    expect(ageOn("2008-11-15", today)).toBe(18);
  });
});

describe("toIsoDate and fromIsoDate", () => {
  it("convert between a local date and YYYY-MM-DD", () => {
    expect(toIsoDate(new Date(2014, 2, 5))).toBe("2014-03-05");
    expect(fromIsoDate("2014-03-05")).toEqual(new Date(2014, 2, 5));
  });
});
