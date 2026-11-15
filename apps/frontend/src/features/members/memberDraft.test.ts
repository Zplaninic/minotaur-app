import { describe, expect, it } from "vitest";
import { emptyMemberDraft, newGuardianDraft, validateMemberDraft, type MemberDraft } from "./memberDraft";

const today = new Date(2026, 10, 15);

const adult: MemberDraft = {
  ...emptyMemberDraft,
  orgId: "1",
  name: "Marko",
  surname: "Babić",
  birthday: "1990-05-01",
};

describe("validateMemberDraft", () => {
  it("turns a valid draft into the request body, leaving empty optional fields out", () => {
    expect(validateMemberDraft(adult, today)).toEqual({
      ok: true,
      body: { orgId: "1", name: "Marko", surname: "Babić", birthday: "1990-05-01", guardians: [] },
    });
  });

  it("reports each invalid field by its path", () => {
    const result = validateMemberDraft({ ...emptyMemberDraft, taxNumber: "123" }, today);
    expect(result).toEqual({
      ok: false,
      errors: {
        orgId: "memberForm.error.org",
        name: "memberForm.error.name",
        surname: "memberForm.error.surname",
        birthday: "memberForm.error.birthday",
        taxNumber: "memberForm.error.taxNumber",
      },
    });
  });

  it("requires a guardian for a member under 18", () => {
    const result = validateMemberDraft({ ...adult, birthday: "2008-11-16" }, today);
    expect(result).toEqual({ ok: false, errors: { guardians: "memberForm.error.guardianRequired" } });
  });

  it("accepts a member who turns 18 today without a guardian", () => {
    expect(validateMemberDraft({ ...adult, birthday: "2008-11-15" }, today).ok).toBe(true);
  });

  it("reports guardian fields by their index", () => {
    const guardian = { ...newGuardianDraft("a"), name: "Iva", email: "iva@" };
    const result = validateMemberDraft({ ...adult, guardians: [guardian] }, today);
    expect(result).toEqual({
      ok: false,
      errors: {
        "guardians.0.surname": "memberForm.error.surname",
        "guardians.0.email": "memberForm.error.email",
      },
    });
  });
});
