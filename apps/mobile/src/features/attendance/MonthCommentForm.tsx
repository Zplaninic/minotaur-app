import { MAX_MONTH_COMMENT_LENGTH, type AttendanceMemberResponse, type Month } from "@repo/shared";
import { toErrorCode, validateMonthCommentDraft, type MonthCommentError } from "@repo/shared/client";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSetMonthComment } from "../../api/attendance";
import { Button } from "../../components/Button";
import { fieldStyles } from "../../components/fieldStyles";
import { TextField } from "../../components/TextField";
import { monthCommentErrorKey, useMessages } from "../../lib/messages";

type MonthCommentFormProps = {
  groupId: string;
  month: Month;
  member: AttendanceMemberResponse;
};

// The member's comment for the month, the same in all their groups. Blank
// text clears it.
export const MonthCommentForm = ({ groupId, month, member }: MonthCommentFormProps) => {
  const { errorMessage, t } = useMessages();
  const setComment = useSetMonthComment(groupId, month, member.id);
  // The form's own text, starting from the saved comment.
  const [draft, setDraft] = useState(member.comment ?? "");
  const [fieldError, setFieldError] = useState<MonthCommentError | undefined>();

  const onSave = () => {
    const result = validateMonthCommentDraft(draft, member.comment);
    if (result.kind === "invalid") {
      setFieldError(result.error);
      return;
    }
    setFieldError(undefined);
    if (result.kind === "save") {
      setComment.mutate(result.comment, { onSuccess: () => setDraft(result.comment ?? "") });
    }
  };

  const error = fieldError
    ? t(monthCommentErrorKey(fieldError), { max: MAX_MONTH_COMMENT_LENGTH })
    : setComment.error
      ? errorMessage(toErrorCode(setComment.error))
      : undefined;
  const unchanged = validateMonthCommentDraft(draft, member.comment).kind === "unchanged";

  return (
    <View style={fieldStyles.field}>
      <TextField
        label={t("monthCommentForm.label")}
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          setComment.reset();
        }}
        error={error}
        optional
        multiline
        maxLength={MAX_MONTH_COMMENT_LENGTH}
        autoCapitalize="sentences"
      />
      <Button
        label={t("monthCommentForm.save")}
        variant="secondary"
        onPress={onSave}
        disabled={setComment.isPending || unchanged}
      />
      {setComment.isSuccess && unchanged ? (
        <Text style={fieldStyles.hint} accessibilityLiveRegion="polite">
          {t("monthCommentForm.saved")}
        </Text>
      ) : null}
    </View>
  );
};
