import {
  acceptEnrollmentChildBody,
  createEnrollmentRequestBody,
  type AcceptEnrollmentChildBody,
  type CreateEnrollmentRequestBody,
  type EnrollmentRequestResponse,
} from "../types/enrollmentRequest.js";

// Form state for the add-request form: every field as the text the user typed.
export type EnrollmentChildDraft = { key: string; name: string; age: string };

export type EnrollmentRequestDraft = {
  parentName: string;
  parentSurname: string;
  parentPhone: string;
  parentEmail: string;
  rawText: string;
  children: EnrollmentChildDraft[];
};

// Apps turn these codes into their own messages.
export type EnrollmentFieldError =
  | "parentName"
  | "parentSurname"
  | "parentPhone"
  | "parentEmail"
  | "children"
  | "childName"
  | "childAge"
  | "invalid";

// Keyed by field path, e.g. "parentName", "children", "children.0.age".
export type EnrollmentFieldErrors = Partial<Record<string, EnrollmentFieldError>>;

export type EnrollmentDraftValidation =
  | { ok: true; body: CreateEnrollmentRequestBody }
  | { ok: false; errors: EnrollmentFieldErrors };

export const newEnrollmentChildDraft = (key: string): EnrollmentChildDraft => ({ key, name: "", age: "" });

export const emptyEnrollmentRequestDraft = (childKey: string): EnrollmentRequestDraft => ({
  parentName: "",
  parentSurname: "",
  parentPhone: "",
  parentEmail: "",
  rawText: "",
  children: [newEnrollmentChildDraft(childKey)],
});

const optional = (value: string): string | undefined => (value.trim() === "" ? undefined : value);

// "4", "4.5" and "4,5" as years; anything else is NaN and fails validation.
export const parseAgeInput = (input: string): number => {
  const match = /^(\d{1,2})(?:[.,](\d))?$/.exec(input.trim());
  return match ? Number(`${match[1]}.${match[2] ?? "0"}`) : Number.NaN;
};

// An age as form text, with a decimal point: 4.5 → "4.5".
export const ageToInput = (age: number | null): string => (age === null ? "" : String(age));

const fieldError = (path: readonly PropertyKey[]): EnrollmentFieldError => {
  const [field, , childField] = path;
  if (field === "children") {
    if (childField === "name") return "childName";
    if (childField === "age") return "childAge";
    return "children";
  }
  switch (field) {
    case "parentName":
    case "parentSurname":
    case "parentPhone":
    case "parentEmail":
      return field;
    default:
      return "invalid";
  }
};

export const validateEnrollmentDraft = (draft: EnrollmentRequestDraft): EnrollmentDraftValidation => {
  const result = createEnrollmentRequestBody.safeParse({
    parentName: draft.parentName,
    parentSurname: optional(draft.parentSurname),
    parentPhone: optional(draft.parentPhone),
    parentEmail: optional(draft.parentEmail),
    rawText: optional(draft.rawText),
    children: draft.children.map((child) => ({ name: child.name, age: parseAgeInput(child.age) })),
  });
  if (result.success) {
    return { ok: true, body: result.data };
  }

  const errors: EnrollmentFieldErrors = {};
  for (const issue of result.error.issues) {
    // A child's field is keyed by its full path, a list problem by "children".
    const key = issue.path.length >= 3 ? issue.path.slice(0, 3).join(".") : String(issue.path[0] ?? "");
    errors[key] ??= fieldError(issue.path);
  }
  return { ok: false, errors };
};

// Form state for accepting one child.
export type AcceptEnrollmentDraft = { orgId: string; surname: string; groupId: string };

export type AcceptEnrollmentFieldError = "org" | "surname" | "group";

export type AcceptEnrollmentDraftValidation =
  | { ok: true; body: AcceptEnrollmentChildBody }
  | { ok: false; errors: Partial<Record<keyof AcceptEnrollmentDraft, AcceptEnrollmentFieldError>> };

// The form has no child surname, so the parent's is the best first guess.
export const acceptEnrollmentDraft = (
  request: Pick<EnrollmentRequestResponse, "parentSurname">,
  child: { groupId: string | null },
  orgId: string,
): AcceptEnrollmentDraft => ({ orgId, surname: request.parentSurname ?? "", groupId: child.groupId ?? "" });

const acceptFieldErrors: Record<keyof AcceptEnrollmentDraft, AcceptEnrollmentFieldError> = {
  orgId: "org",
  surname: "surname",
  groupId: "group",
};

const isAcceptField = (field: PropertyKey | undefined): field is keyof AcceptEnrollmentDraft =>
  field === "orgId" || field === "surname" || field === "groupId";

export const validateAcceptEnrollmentDraft = (draft: AcceptEnrollmentDraft): AcceptEnrollmentDraftValidation => {
  const result = acceptEnrollmentChildBody.safeParse(draft);
  if (result.success) {
    return { ok: true, body: result.data };
  }
  const errors: Partial<Record<keyof AcceptEnrollmentDraft, AcceptEnrollmentFieldError>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isAcceptField(field)) {
      errors[field] ??= acceptFieldErrors[field];
    }
  }
  return { ok: false, errors };
};
