import {
  ADULT_AGE,
  createMemberBody,
  type CreateMemberBody,
  type CreateMemberInput,
  type MemberResponse,
  type UpdateMemberBody,
} from "../types/member.js";
import { ageOn, toIsoDate } from "./age.js";

// Form state for the add-member form: every field as the text the user typed.
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

// Apps turn these codes into their own messages.
export type MemberFieldError =
  | "org"
  | "name"
  | "surname"
  | "birthday"
  | "taxNumber"
  | "email"
  | "phone"
  | "guardian"
  | "guardianDuplicate"
  | "guardianRequired"
  | "invalid";

// Keyed by field path, e.g. "name", "guardians", "guardians.0.email".
export type MemberFieldErrors = Partial<Record<string, MemberFieldError>>;

export type MemberDraftValidation = { ok: true; body: CreateMemberBody } | { ok: false; errors: MemberFieldErrors };

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
  birthday: optional(draft.birthday),
  taxNumber: optional(draft.taxNumber),
  email: optional(draft.email),
  phone: optional(draft.phone),
  guardians: draft.guardians.map((guardian) =>
    guardian.kind === "existing"
      ? { kind: "existing", guardianId: guardian.guardianId }
      : {
          kind: "new",
          name: guardian.name,
          surname: optional(guardian.surname),
          email: optional(guardian.email),
          phone: optional(guardian.phone),
        },
  ),
});

const fieldErrors: Partial<Record<string, MemberFieldError>> = {
  orgId: "org",
  name: "name",
  surname: "surname",
  birthday: "birthday",
  taxNumber: "taxNumber",
  email: "email",
  phone: "phone",
  guardianId: "guardian",
  guardians: "guardianDuplicate",
};

const errorForPath = (path: readonly PropertyKey[]): MemberFieldError => {
  const field = path.at(-1);
  return (typeof field === "string" ? fieldErrors[field] : undefined) ?? "invalid";
};

export type MemberDraftRules = {
  // Set for members who log in: their email is their login name.
  emailRequired?: boolean;
};

export const validateMemberDraft = (
  draft: MemberDraft,
  today: Date,
  rules: MemberDraftRules = {},
): MemberDraftValidation => {
  const result = createMemberBody.safeParse(toCreateMemberInput(draft));
  const errors: MemberFieldErrors = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.map(String).join(".");
      errors[key] ??= errorForPath(issue.path);
    }
  }

  // ISO dates sort like the days they stand for.
  if (errors["birthday"] === undefined && draft.birthday > toIsoDate(today)) {
    errors["birthday"] = "birthday";
  }
  if (rules.emailRequired && draft.email.trim() === "") {
    errors["email"] ??= "email";
  }

  const birthdayValid = errors["birthday"] === undefined && draft.birthday !== "";
  if (birthdayValid && draft.guardians.length === 0 && ageOn(draft.birthday, today) < ADULT_AGE) {
    errors["guardians"] ??= "guardianRequired";
  }

  return result.success && Object.keys(errors).length === 0 ? { ok: true, body: result.data } : { ok: false, errors };
};

// The edit form starts from the member as it is; its guardians are existing ones.
export const memberDraftFrom = (member: MemberResponse): MemberDraft => ({
  orgId: member.orgId,
  name: member.name,
  surname: member.surname,
  birthday: member.birthday ?? "",
  taxNumber: member.taxNumber ?? "",
  email: member.email ?? "",
  phone: member.phone ?? "",
  guardians: member.guardians.map((guardian) => ({
    ...newGuardianDraft(guardian.id),
    kind: "existing",
    guardianId: guardian.id,
  })),
});

// The org is not editable, so the update body leaves it out.
export const toUpdateMemberBody = ({ orgId: _orgId, ...body }: CreateMemberBody): UpdateMemberBody => body;
