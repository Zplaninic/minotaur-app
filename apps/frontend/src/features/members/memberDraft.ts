import { ADULT_AGE, createMemberBody, type CreateMemberBody, type CreateMemberInput } from "@repo/shared";
import { ageOn } from "../../lib/age";
import type { MessageKey } from "../../lib/messages";

export type GuardianDraft = {
  key: string;
  kind: "new" | "existing";
  guardianId: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
};

export type MemberDraft = {
  orgId: string;
  name: string;
  surname: string;
  birthday: string;
  taxNumber: string;
  email: string;
  phone: string;
  guardians: GuardianDraft[];
};

// Keyed by field path, e.g. "name", "guardians", "guardians.0.email".
export type FieldErrors = Partial<Record<string, MessageKey>>;

export type DraftValidation = { ok: true; body: CreateMemberBody } | { ok: false; errors: FieldErrors };

export const emptyMemberDraft: MemberDraft = {
  orgId: "",
  name: "",
  surname: "",
  birthday: "",
  taxNumber: "",
  email: "",
  phone: "",
  guardians: [],
};

export const newGuardianDraft = (key: string): GuardianDraft => ({
  key,
  kind: "new",
  guardianId: "",
  name: "",
  surname: "",
  email: "",
  phone: "",
});

const optional = (value: string): string | undefined => (value.trim() === "" ? undefined : value);

export const toCreateMemberInput = (draft: MemberDraft): CreateMemberInput => ({
  orgId: draft.orgId,
  name: draft.name,
  surname: draft.surname,
  birthday: draft.birthday,
  taxNumber: optional(draft.taxNumber),
  email: optional(draft.email),
  phone: optional(draft.phone),
  guardians: draft.guardians.map((guardian) =>
    guardian.kind === "existing"
      ? { kind: "existing", guardianId: guardian.guardianId }
      : {
          kind: "new",
          name: guardian.name,
          surname: guardian.surname,
          email: optional(guardian.email),
          phone: optional(guardian.phone),
        },
  ),
});

const fieldMessages: Partial<Record<string, MessageKey>> = {
  orgId: "memberForm.error.org",
  name: "memberForm.error.name",
  surname: "memberForm.error.surname",
  birthday: "memberForm.error.birthday",
  taxNumber: "memberForm.error.taxNumber",
  email: "memberForm.error.email",
  phone: "memberForm.error.phone",
  guardianId: "memberForm.error.guardian",
  guardians: "memberForm.error.guardianDuplicate",
};

const messageForPath = (path: readonly PropertyKey[]): MessageKey => {
  const field = path.at(-1);
  return (typeof field === "string" ? fieldMessages[field] : undefined) ?? "memberForm.error.invalid";
};

export const validateMemberDraft = (draft: MemberDraft, today: Date): DraftValidation => {
  const result = createMemberBody.safeParse(toCreateMemberInput(draft));
  const errors: FieldErrors = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.map(String).join(".");
      errors[key] ??= messageForPath(issue.path);
    }
  }

  const birthdayValid = errors["birthday"] === undefined && draft.birthday !== "";
  if (birthdayValid && draft.guardians.length === 0 && ageOn(draft.birthday, today) < ADULT_AGE) {
    errors["guardians"] ??= "memberForm.error.guardianRequired";
  }

  return result.success && Object.keys(errors).length === 0 ? { ok: true, body: result.data } : { ok: false, errors };
};
