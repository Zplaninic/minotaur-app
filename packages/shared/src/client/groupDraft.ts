import { createGroupBody, weekday, type CreateGroupBody, type Weekday } from "../types/group.js";

// Form state for the add-group form. Times are HH:mm, or "" when not chosen yet.
export type GroupDraft = {
  ownerId: string;
  days: readonly Weekday[];
  from: string;
  to: string;
};

// Apps turn these codes into their own messages.
export type GroupFieldError = "owner" | "days" | "from" | "to" | "timeOrder" | "invalid";

// Keyed by field: "ownerId", "days", "from", "to".
export type GroupFieldErrors = Partial<Record<string, GroupFieldError>>;

export type GroupDraftValidation = { ok: true; body: CreateGroupBody } | { ok: false; errors: GroupFieldErrors };

export const emptyGroupDraft: GroupDraft = { ownerId: "", days: [], from: "", to: "" };

// Adds or removes a day, keeping the days in week order.
export const toggleWeekday = (days: readonly Weekday[], day: Weekday): Weekday[] =>
  weekday.options.filter((option) => (option === day ? !days.includes(day) : days.includes(option)));

const fieldErrors: Partial<Record<string, GroupFieldError>> = {
  ownerId: "owner",
  days: "days",
  from: "from",
  to: "to",
};

export const validateGroupDraft = (draft: GroupDraft): GroupDraftValidation => {
  const result = createGroupBody.safeParse(draft);
  if (result.success) {
    return { ok: true, body: result.data };
  }

  const errors: GroupFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    // The only custom issue on "to" is the end not being after the start.
    const code = field === "to" && issue.code === "custom" ? "timeOrder" : (fieldErrors[field] ?? "invalid");
    errors[field] ??= code;
  }
  return { ok: false, errors };
};
