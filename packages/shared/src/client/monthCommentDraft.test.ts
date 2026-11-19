import { describe, expect, it } from "vitest";
import { MAX_MONTH_COMMENT_LENGTH } from "../types/attendance.js";
import { validateMonthCommentDraft } from "./monthCommentDraft.js";

describe("validateMonthCommentDraft", () => {
  it("saves trimmed new text", () => {
    expect(validateMonthCommentDraft("  Injured knee ", null)).toEqual({ kind: "save", comment: "Injured knee" });
  });

  it("clears the comment when the text is blank", () => {
    expect(validateMonthCommentDraft("   ", "Injured knee")).toEqual({ kind: "save", comment: null });
  });

  it("does nothing when only whitespace changed", () => {
    expect(validateMonthCommentDraft("Injured knee ", "Injured knee")).toEqual({ kind: "unchanged" });
    expect(validateMonthCommentDraft("", null)).toEqual({ kind: "unchanged" });
  });

  it("rejects text over the limit", () => {
    expect(validateMonthCommentDraft("a".repeat(MAX_MONTH_COMMENT_LENGTH + 1), null)).toEqual({
      kind: "invalid",
      error: "tooLong",
    });
    expect(validateMonthCommentDraft("a".repeat(MAX_MONTH_COMMENT_LENGTH), null).kind).toBe("save");
  });
});
