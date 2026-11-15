import { describe, expect, it } from "vitest";
import { createMemberBody, memberResponse } from "./member.js";

const validBody = {
  orgId: "1",
  name: "Ana",
  surname: "Horvat",
  birthday: "2014-03-12",
};

describe("createMemberBody", () => {
  it("accepts the required fields and defaults guardians to an empty list", () => {
    expect(createMemberBody.parse(validBody)).toEqual({ ...validBody, guardians: [] });
  });

  it("trims names", () => {
    expect(createMemberBody.parse({ ...validBody, name: "  Ana " }).name).toBe("Ana");
  });

  it("accepts new and existing guardians", () => {
    const guardians = [
      { kind: "existing", guardianId: "3" },
      { kind: "new", name: "Iva", surname: "Horvat", phone: "+385 91 123 4567" },
    ];
    expect(createMemberBody.parse({ ...validBody, guardians }).guardians).toEqual(guardians);
  });

  it("rejects the same existing guardian twice", () => {
    const guardians = [
      { kind: "existing", guardianId: "3" },
      { kind: "existing", guardianId: "3" },
    ];
    expect(createMemberBody.safeParse({ ...validBody, guardians }).success).toBe(false);
  });

  it.each([
    ["an empty name", { name: " " }],
    ["a birthday that is not a date", { birthday: "12.03.2014" }],
    ["a tax number with 10 digits", { taxNumber: "1234567890" }],
    ["a tax number with letters", { taxNumber: "1234567890a" }],
    ["an invalid email", { email: "ana@" }],
    ["an invalid phone", { phone: "call me" }],
  ])("rejects %s", (_label, override) => {
    expect(createMemberBody.safeParse({ ...validBody, ...override }).success).toBe(false);
  });

  it("accepts an 11 digit tax number starting with 0", () => {
    expect(createMemberBody.parse({ ...validBody, taxNumber: "01234567890" }).taxNumber).toBe("01234567890");
  });
});

describe("memberResponse", () => {
  it("requires an ISO datetime for createdAt", () => {
    const value = {
      id: "1",
      orgId: "1",
      name: "Ana",
      surname: "Horvat",
      birthday: "2014-03-12",
      role: "child",
      taxNumber: null,
      email: null,
      phone: null,
      guardians: [],
      createdAt: "2026-11-15T17:00:22.251Z",
    };
    expect(memberResponse.parse(value)).toEqual(value);
    expect(memberResponse.safeParse({ ...value, createdAt: "2026-11-15" }).success).toBe(false);
  });
});

describe("email", () => {
  it("is trimmed and stored lowercase", () => {
    expect(createMemberBody.parse({ ...validBody, email: " Ana@Example.COM " }).email).toBe("ana@example.com");
  });
});
