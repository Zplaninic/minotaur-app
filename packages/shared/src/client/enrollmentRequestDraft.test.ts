import { describe, expect, it } from "vitest";
import {
  acceptEnrollmentDraft,
  emptyEnrollmentRequestDraft,
  parseAgeInput,
  validateAcceptEnrollmentDraft,
  validateEnrollmentDraft,
  type EnrollmentRequestDraft,
} from "./enrollmentRequestDraft.js";

const draft = (overrides: Partial<EnrollmentRequestDraft> = {}): EnrollmentRequestDraft => ({
  ...emptyEnrollmentRequestDraft("c1"),
  parentName: "Ivan",
  parentSurname: "Horvat",
  parentPhone: "091 000 0000",
  parentEmail: "Parent@Example.com",
  children: [
    { key: "c1", name: "Lea", age: "4,5" },
    { key: "c2", name: "Jan", age: "9" },
  ],
  ...overrides,
});

describe("parseAgeInput", () => {
  it.each([
    ["4", 4],
    ["4.5", 4.5],
    [" 4,5 ", 4.5],
  ])("reads %j as %d", (input, age) => {
    expect(parseAgeInput(input)).toBe(age);
  });

  it.each(["", "four", "4.55", "-1", "100"])("rejects %j", (input) => {
    expect(parseAgeInput(input)).toBeNaN();
  });
});

describe("validateEnrollmentDraft", () => {
  it("turns a filled draft into a request body, leaving out blank optional fields", () => {
    expect(validateEnrollmentDraft(draft({ parentSurname: " " }))).toEqual({
      ok: true,
      body: {
        parentName: "Ivan",
        parentPhone: "091 000 0000",
        parentEmail: "parent@example.com",
        children: [
          { name: "Lea", age: 4.5 },
          { name: "Jan", age: 9 },
        ],
      },
    });
  });

  it("keys a child's errors by its position", () => {
    const result = validateEnrollmentDraft(
      draft({
        parentEmail: "not an email",
        children: [
          { key: "c1", name: "", age: "4" },
          { key: "c2", name: "Jan", age: "x" },
        ],
      }),
    );
    expect(result).toEqual({
      ok: false,
      errors: { parentEmail: "parentEmail", "children.0.name": "childName", "children.1.age": "childAge" },
    });
  });

  it("needs at least one child", () => {
    expect(validateEnrollmentDraft(draft({ children: [] }))).toEqual({ ok: false, errors: { children: "children" } });
  });
});

describe("accept draft", () => {
  it("prefills the parent's surname and the child's group", () => {
    expect(acceptEnrollmentDraft({ parentSurname: "Horvat" }, { groupId: "3" }, "1")).toEqual({
      orgId: "1",
      surname: "Horvat",
      groupId: "3",
    });
    expect(acceptEnrollmentDraft({ parentSurname: null }, { groupId: null }, "")).toEqual({
      orgId: "",
      surname: "",
      groupId: "",
    });
  });

  it("requires an org, a surname and a group", () => {
    expect(validateAcceptEnrollmentDraft({ orgId: "", surname: " ", groupId: "" })).toEqual({
      ok: false,
      errors: { orgId: "org", surname: "surname", groupId: "group" },
    });
    expect(validateAcceptEnrollmentDraft({ orgId: "1", surname: "Horvat", groupId: "3" })).toEqual({
      ok: true,
      body: { orgId: "1", surname: "Horvat", groupId: "3" },
    });
  });
});
