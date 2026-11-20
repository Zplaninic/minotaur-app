import { describe, expect, it } from "vitest";
import { parseAge, parseEnrollmentEmail } from "./parse.js";

// Fake data only.
const oneChild = `Ime Roditelja:
ivan horvatić

Telefon:
091 000 0000

Ime Djeteta:
lea

Dob Djeteta:
4.5

Email:
Parent.One@Example.com
`;

describe("parseEnrollmentEmail", () => {
  it("reads a form email with values on the line after each label", () => {
    expect(parseEnrollmentEmail(oneChild)).toEqual({
      enrollment: {
        parent: { name: "Ivan", surname: "Horvatić", phone: "091 000 0000", email: "parent.one@example.com" },
        children: [{ name: "Lea", age: 4.5 }],
      },
      problems: [],
    });
  });

  it("reads values on the label's own line", () => {
    const { enrollment, problems } = parseEnrollmentEmail(
      "Ime Roditelja: Ana Kovač\nTelefon: 091000000\nIme Djeteta: Mia\nDob Djeteta: 7\nEmail: ana@example.com",
    );
    expect(problems).toEqual([]);
    expect(enrollment.parent).toEqual({ name: "Ana", surname: "Kovač", phone: "091000000", email: "ana@example.com" });
    expect(enrollment.children).toEqual([{ name: "Mia", age: 7 }]);
  });

  it("pairs several children with their ages by position", () => {
    const { enrollment, problems } = parseEnrollmentEmail(
      oneChild.replace("lea", "Jan, Eva").replace("4.5", "9, 7,5"),
    );
    expect(problems).toEqual([]);
    expect(enrollment.children).toEqual([
      { name: "Jan", age: 9 },
      { name: "Eva", age: 7.5 },
    ]);
  });

  it("accepts 'i' and slashes between children", () => {
    const { enrollment } = parseEnrollmentEmail(oneChild.replace("lea", "Jan i Eva").replace("4.5", "9 / 7"));
    expect(enrollment.children).toEqual([
      { name: "Jan", age: 9 },
      { name: "Eva", age: 7 },
    ]);
  });

  it("reports a different number of names and ages", () => {
    const { enrollment, problems } = parseEnrollmentEmail(oneChild.replace("lea", "Jan, Eva"));
    expect(problems).toEqual([{ field: "childAge", code: "child_count_mismatch" }]);
    expect(enrollment.children).toEqual([
      { name: "Jan", age: 4.5 },
      { name: "Eva", age: null },
    ]);
  });

  it("reports missing fields and unreadable ages", () => {
    const { enrollment, problems } = parseEnrollmentEmail("Ime Djeteta:\nLea\nDob Djeteta: four");
    expect(problems).toEqual([
      { field: "parentName", code: "missing" },
      { field: "phone", code: "missing" },
      { field: "email", code: "missing" },
      { field: "childAge", code: "invalid_age" },
    ]);
    expect(enrollment.parent).toEqual({ name: "", surname: null, phone: null, email: null });
    expect(enrollment.children).toEqual([{ name: "Lea", age: null }]);
  });

  it("does not take the next label as a value", () => {
    const { problems } = parseEnrollmentEmail("Telefon:\nEmail: a@example.com");
    expect(problems).toContainEqual({ field: "phone", code: "missing" });
  });

  it("knows the common other spellings of the labels", () => {
    const { enrollment, problems } = parseEnrollmentEmail(
      "Ime i prezime roditelja: Ana Kovač\nMobitel: 091000000\nDijete: Mia\nDob: 7\nE-mail: ana@example.com",
    );
    expect(problems).toEqual([]);
    expect(enrollment.parent).toEqual({ name: "Ana", surname: "Kovač", phone: "091000000", email: "ana@example.com" });
    expect(enrollment.children).toEqual([{ name: "Mia", age: 7 }]);
  });

  it("uses custom labels", () => {
    const { enrollment } = parseEnrollmentEmail("Parent: Tom Lee\nChild: Sam\nAge: 6", {
      parentName: ["Parent"],
      phone: ["Phone"],
      email: ["Email"],
      childName: ["Child"],
      childAge: ["Age"],
    });
    expect(enrollment.parent.surname).toBe("Lee");
    expect(enrollment.children).toEqual([{ name: "Sam", age: 6 }]);
  });
});

describe("parseAge", () => {
  it("reads whole years, decimal points, decimal commas and a trailing word", () => {
    expect(parseAge("4")).toBe(4);
    expect(parseAge("4.5")).toBe(4.5);
    expect(parseAge("4,5")).toBe(4.5);
    expect(parseAge("6 godina")).toBe(6);
  });

  it("rejects anything else", () => {
    expect(parseAge("four")).toBeNull();
    expect(parseAge("4.55")).toBeNull();
    expect(parseAge("-4")).toBeNull();
    expect(parseAge("")).toBeNull();
  });
});
