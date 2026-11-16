import { describe, expect, it } from "vitest";
import type { MemberResponse } from "../types/member.js";
import {
  emptyMemberDraft,
  memberDraftFrom,
  newGuardianDraft,
  toUpdateMemberBody,
  validateMemberDraft,
  type MemberDraft,
} from "./memberDraft.js";

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
      errors: { orgId: "org", name: "name", surname: "surname", birthday: "birthday", taxNumber: "taxNumber" },
    });
  });

  it("requires a guardian for a member under 18", () => {
    const result = validateMemberDraft({ ...adult, birthday: "2008-11-16" }, today);
    expect(result).toEqual({ ok: false, errors: { guardians: "guardianRequired" } });
  });

  it("accepts a member who turns 18 today without a guardian", () => {
    expect(validateMemberDraft({ ...adult, birthday: "2008-11-15" }, today).ok).toBe(true);
  });

  it("reports guardian fields by their index", () => {
    const guardian = { ...newGuardianDraft("a"), name: "Iva", email: "iva@" };
    const result = validateMemberDraft({ ...adult, guardians: [guardian] }, today);
    expect(result).toEqual({
      ok: false,
      errors: { "guardians.0.surname": "surname", "guardians.0.email": "email" },
    });
  });

  it("sends an existing guardian by id only", () => {
    const guardian = { ...newGuardianDraft("a"), kind: "existing" as const, guardianId: "3", name: "ignored" };
    const result = validateMemberDraft({ ...adult, guardians: [guardian] }, today);
    expect(result.ok && result.body.guardians).toEqual([{ kind: "existing", guardianId: "3" }]);
  });
});

describe("editing a member", () => {
  const member: MemberResponse = {
    id: "7",
    orgId: "1",
    name: "Lovro",
    surname: "Golub",
    birthday: "2016-04-02",
    role: "child",
    taxNumber: null,
    email: null,
    phone: "+385 91 000 0000",
    guardians: [{ id: "3", name: "Maja", surname: "Golub", email: null, phone: null }],
    createdAt: "2026-11-15T17:00:00.000Z",
  };

  it("starts the draft from the member, with its guardians as existing ones", () => {
    const draft = memberDraftFrom(member);
    expect(draft).toMatchObject({ orgId: "1", name: "Lovro", taxNumber: "", email: "", phone: "+385 91 000 0000" });
    expect(draft.guardians).toMatchObject([{ kind: "existing", guardianId: "3" }]);
  });

  it("turns the unchanged draft into an update body without the org", () => {
    const validation = validateMemberDraft(memberDraftFrom(member), today);
    if (!validation.ok) {
      throw new Error("expected a valid draft");
    }
    expect(toUpdateMemberBody(validation.body)).toEqual({
      name: "Lovro",
      surname: "Golub",
      birthday: "2016-04-02",
      phone: "+385 91 000 0000",
      guardians: [{ kind: "existing", guardianId: "3" }],
    });
  });
});
