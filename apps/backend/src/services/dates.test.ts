import { describe, expect, it } from "vitest";
import { isoDateIn, nextMonth, trainingDates } from "./dates.js";

describe("trainingDates", () => {
  it("lists every Monday and Wednesday of November 2026", () => {
    expect(trainingDates("2026-11", ["monday", "wednesday"])).toEqual([
      "2026-11-02",
      "2026-11-04",
      "2026-11-09",
      "2026-11-11",
      "2026-11-16",
      "2026-11-18",
      "2026-11-23",
      "2026-11-25",
      "2026-11-30",
    ]);
  });

  it("includes the first and last day of the month", () => {
    expect(trainingDates("2026-12", ["tuesday", "thursday"]).at(0)).toBe("2026-12-01");
    expect(trainingDates("2026-12", ["thursday"]).at(-1)).toBe("2026-12-31");
    expect(trainingDates("2027-02", ["sunday"])).toEqual(["2027-02-07", "2027-02-14", "2027-02-21", "2027-02-28"]);
  });
});

describe("isoDateIn", () => {
  it("returns the day in the given time zone", () => {
    const lateEvening = new Date("2026-11-16T23:30:00.000Z");
    expect(isoDateIn(lateEvening, "UTC")).toBe("2026-11-16");
    expect(isoDateIn(lateEvening, "Europe/Zagreb")).toBe("2026-11-17");
  });
});

describe("nextMonth", () => {
  it("rolls December over to January of the next year", () => {
    expect(nextMonth("2026-11")).toBe("2026-12");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });
});
