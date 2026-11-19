import { monthComment } from "../types/attendance.js";

// Apps turn this code into their own message.
export type MonthCommentError = "tooLong";

export type MonthCommentDraftValidation =
  | { kind: "unchanged" }
  | { kind: "save"; comment: string | null }
  | { kind: "invalid"; error: MonthCommentError };

// What to do with the comment field's text, given the saved comment.
// Whitespace-only edits count as unchanged.
export const validateMonthCommentDraft = (draft: string, saved: string | null): MonthCommentDraftValidation => {
  const result = monthComment.safeParse(draft);
  if (!result.success) {
    return { kind: "invalid", error: "tooLong" };
  }
  return result.data === saved ? { kind: "unchanged" } : { kind: "save", comment: result.data };
};
