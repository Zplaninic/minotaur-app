import { describe, expect, it } from "vitest";
import { importableMembers, readImportFile, toIsoBirthday } from "./memberImport.js";

const header = "Name\tSurname\tBirthday\tGuardian\tGuardian email\tName Guardian\tSupscription";

describe("toIsoBirthday", () => {
  it("reads Croatian and ISO dates", () => {
    expect(toIsoBirthday("1.5.2015.")).toBe("2015-05-01");
    expect(toIsoBirthday("01. 05. 2015")).toBe("2015-05-01");
    expect(toIsoBirthday("2015-05-01")).toBe("2015-05-01");
  });

  it("passes anything else on unchanged", () => {
    expect(toIsoBirthday("May 1st")).toBe("May 1st");
  });
});

describe("readImportFile", () => {
  it("maps the club's columns by header and ignores the Guardian column", () => {
    const file = readImportFile(
      `${header}\nLovro\tGolub\t2.4.2016.\tyes\tIVA@example.com\tIva Golub\tKids 2x\n`,
    );
    expect(file).toEqual({
      ok: true,
      lines: [
        {
          row: 2,
          cells: {
            name: "Lovro",
            surname: "Golub",
            birthday: "2.4.2016.",
            guardianName: "Iva Golub",
            guardianEmail: "IVA@example.com",
            subscription: "Kids 2x",
          },
          errors: [],
          member: {
            name: "Lovro",
            surname: "Golub",
            birthday: "2016-04-02",
            guardianName: "Iva Golub",
            guardianEmail: "iva@example.com",
            subscription: "Kids 2x",
          },
        },
      ],
    });
  });

  it("leaves empty optional fields out and skips blank rows", () => {
    const file = readImportFile("Surname;Name\n;\nHorvat;Ana\n");
    expect(file.ok && file.lines.map((line) => ({ row: line.row, member: line.member }))).toEqual([
      { row: 3, member: { name: "Ana", surname: "Horvat" } },
    ]);
  });

  it("reports invalid fields per row", () => {
    const file = readImportFile(`${header}\n\tGolub\t31.13.2016\t\tiva@\t\t\n`);
    expect(file.ok && file.lines[0]?.errors).toEqual(["name", "birthday", "guardianName", "guardianEmail"]);
    expect(file.ok && importableMembers(file.lines)).toEqual([]);
  });

  it("requires a guardian name when a guardian email is given", () => {
    const file = readImportFile(`${header}\nLovro\tGolub\t\t\tiva@example.com\t\t\n`);
    expect(file.ok && file.lines[0]?.errors).toEqual(["guardianName"]);
  });

  it("rejects a file without the name and surname columns", () => {
    expect(readImportFile("Name,Birthday\nAna,1.1.2000")).toEqual({
      ok: false,
      error: "missingColumns",
      missing: ["surname"],
    });
  });

  it("rejects a file without members", () => {
    expect(readImportFile("")).toMatchObject({ ok: false, error: "empty" });
    expect(readImportFile(`${header}\n\n`)).toMatchObject({ ok: false, error: "empty" });
  });

  it("rejects more rows than one import takes", () => {
    const rows = Array.from({ length: 501 }, (_, index) => `Ana,Horvat${index}`).join("\n");
    expect(readImportFile(`Name,Surname\n${rows}`)).toMatchObject({ ok: false, error: "tooManyRows" });
  });
});
