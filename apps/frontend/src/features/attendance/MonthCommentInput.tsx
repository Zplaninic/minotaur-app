import { MAX_MONTH_COMMENT_LENGTH, type AttendanceMemberResponse, type Month } from "@repo/shared";
import { toErrorCode, validateMonthCommentDraft, type MonthCommentError } from "@repo/shared/client";
import { useId, useState } from "react";
import { useSetMonthComment } from "../../api/attendance";
import { formatMonth, formatPersonName } from "../../lib/format";
import { monthCommentErrorKey, useMessages } from "../../lib/messages";
import styles from "./MonthCommentInput.module.css";

type MonthCommentInputProps = {
  groupId: string;
  month: Month;
  member: AttendanceMemberResponse;
  disabled: boolean;
  // "cell" fits a grid column; "row" takes the full width of a list item.
  layout: "cell" | "row";
};

// The member's comment for the month, the same in all their groups. Saves on
// blur or Enter when the text changed; Escape goes back to the saved comment.
export const MonthCommentInput = ({ groupId, month, member, disabled, layout }: MonthCommentInputProps) => {
  const { errorMessage, t } = useMessages();
  const errorId = useId();
  const setComment = useSetMonthComment(groupId, month, member.id);
  // The text being edited; undefined shows the saved comment.
  const [draft, setDraft] = useState<string | undefined>();
  const [fieldError, setFieldError] = useState<MonthCommentError | undefined>();
  const value = draft ?? member.comment ?? "";

  const save = () => {
    if (draft === undefined || setComment.isPending) {
      return;
    }
    const result = validateMonthCommentDraft(draft, member.comment);
    if (result.kind === "invalid") {
      setFieldError(result.error);
      return;
    }
    setFieldError(undefined);
    if (result.kind === "unchanged") {
      setDraft(undefined);
      return;
    }
    setComment.mutate(result.comment, { onSuccess: () => setDraft(undefined) });
  };

  const error = fieldError
    ? t(monthCommentErrorKey(fieldError), { max: MAX_MONTH_COMMENT_LENGTH })
    : setComment.error
      ? errorMessage(toErrorCode(setComment.error))
      : undefined;

  return (
    <div className={styles[layout]}>
      <input
        type="text"
        className={styles.input}
        value={value}
        maxLength={MAX_MONTH_COMMENT_LENGTH}
        disabled={disabled || setComment.isPending}
        aria-label={t("attendance.commentLabel", { name: formatPersonName(member), month: formatMonth(month) })}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          // Blurring saves, so Enter and leaving the field save only once.
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setDraft(undefined);
            setFieldError(undefined);
            setComment.reset();
          }
        }}
      />
      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
};
