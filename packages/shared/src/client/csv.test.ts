import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv } from "./csv.js";

describe("detectDelimiter", () => {
  it("picks the delimiter the header uses most", () => {
    expect(detectDelimiter("Name\tSurname\tBirthday\nAna\tHorvat\t")).toBe("\t");
    expect(detectDelimiter("Name;Surname;Birthday\nAna;Horvat, Jr.;")).toBe(";");
    expect(detectDelimiter("Name,Surname\nAna,Horvat")).toBe(",");
  });

  it("falls back to a comma for a single column", () => {
    expect(detectDelimiter("Name\nAna")).toBe(",");
  });
});

describe("parseCsv", () => {
  it("splits records on any line break and drops the trailing one", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f\r")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("keeps delimiters, line breaks and doubled quotes inside quoted fields", () => {
    expect(parseCsv('name;note\n"Horvat; Ana";"line 1\nline ""2"""')).toEqual([
      ["name", "note"],
      ["Horvat; Ana", 'line 1\nline "2"'],
    ]);
  });

  it("keeps empty fields and strips a byte order mark", () => {
    expect(parseCsv("﻿a\t\tc\n\t\t")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ]);
  });

  it("returns no records for an empty file", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
