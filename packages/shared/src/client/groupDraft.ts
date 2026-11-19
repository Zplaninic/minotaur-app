import { createGroupBody, weekday, type CreateGroupBody, type GroupResponse, type Weekday } from "../types/group.js";

// Form state for the group form. Times are HH:mm, or "" when not chosen yet.
// Ages are the typed text, "" for no bound.
export type GroupDraft = {
  ownerId: string;
  days: readonly Weekday[];
  from: string;
  to: string;
  ageFrom: string;
  ageTo: string;
};

// Apps turn these codes into their own messages.
export type GroupFieldError = "owner" | "days" | "from" | "to" | "timeOrder" | "age" | "ageOrder" | "invalid";

// Keyed by field: "ownerId", "days", "from", "to", "ageFrom", "ageTo".
export type GroupFieldErrors = Partial<Record<string, GroupFieldError>>;

export type GroupDraftValidation = { ok: true; body: CreateGroupBody } | { ok: false; errors: GroupFieldErrors };

export const emptyGroupDraft: GroupDraft = { ownerId: "", days: [], from: "", to: "", ageFrom: "", ageTo: "" };

const ageToDraft = (age: number | null): string => (age === null ? "" : String(age));

// The edit form starts from the saved group.
export const groupToDraft = (group: GroupResponse): GroupDraft => ({
  ownerId: group.owner.id,
  days: group.days,
  from: group.from,
  to: group.to,
  ageFrom: ageToDraft(group.ageFrom),
  ageTo: ageToDraft(group.ageTo),
});

// Text that is not a whole number becomes NaN, which the schema rejects.
const draftToAge = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
};

// Adds or removes a day, keeping the days in week order.
export const toggleWeekday = (days: readonly Weekday[], day: Weekday): Weekday[] =>
  weekday.options.filter((option) => (option === day ? !days.includes(day) : days.includes(option)));

const fieldErrors: Partial<Record<string, GroupFieldError>> = {
  ownerId: "owner",
  days: "days",
  from: "from",
  to: "to",
  ageFrom: "age",
  ageTo: "age",
};

// The only custom issues are the end time not being after the start, and the
// upper age being below the lower one.
const issueCode = (field: string, code: string): GroupFieldError => {
  if (code === "custom" && field === "to") {
    return "timeOrder";
  }
  if (code === "custom" && field === "ageTo") {
    return "ageOrder";
  }
  return fieldErrors[field] ?? "invalid";
};

export const validateGroupDraft = (draft: GroupDraft): GroupDraftValidation => {
  const result = createGroupBody.safeParse({
    ...draft,
    ageFrom: draftToAge(draft.ageFrom),
    ageTo: draftToAge(draft.ageTo),
  });
  if (result.success) {
    return { ok: true, body: result.data };
  }

  const errors: GroupFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    errors[field] ??= issueCode(field, issue.code);
  }
  return { ok: false, errors };
};
