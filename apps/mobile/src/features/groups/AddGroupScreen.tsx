import { weekday } from "@repo/shared";
import {
  emptyGroupDraft,
  toErrorCode,
  toggleWeekday,
  validateGroupDraft,
  type GroupDraft,
} from "@repo/shared/client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useCreateGroup } from "../../api/groups";
import { useTrainers } from "../../api/members";
import { Button } from "../../components/Button";
import { CheckboxList } from "../../components/CheckboxList";
import { fieldStyles } from "../../components/fieldStyles";
import { OptionList } from "../../components/OptionList";
import { Screen } from "../../components/Screen";
import { TimeField } from "../../components/TimeField";
import { formatSortedName, formatTimeOfDay } from "../../lib/format";
import { errorMessage, groupFieldErrorKey, t, weekdayKey } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, spacing } from "../../theme/tokens";

// Where the time pickers start: most groups train in the late afternoon.
const INITIAL_FROM = "17:00";
const INITIAL_TO = "18:00";

export const AddGroupScreen = () => {
  const router = useRouter();
  const trainers = useTrainers();
  const createGroup = useCreateGroup();
  const [draft, setDraft] = useState<GroupDraft>(emptyGroupDraft);
  const [submitted, setSubmitted] = useState(false);

  const validation = validateGroupDraft(draft);
  const errors = submitted && !validation.ok ? validation.errors : {};
  const fieldError = (field: string) => {
    const code = errors[field];
    return code ? t(groupFieldErrorKey(code)) : undefined;
  };
  const formError = createGroup.error ? errorMessage(toErrorCode(createGroup.error)) : undefined;

  const update = (changes: Partial<GroupDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const save = () => {
    setSubmitted(true);
    if (validation.ok) {
      createGroup.mutate(validation.body, { onSuccess: () => router.back() });
    }
  };

  if (trainers.isPending) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value}>{t("groupForm.trainersLoading")}</Text>
      </Screen>
    );
  }
  if (trainers.isError) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value} accessibilityLiveRegion="polite">
          {errorMessage(toErrorCode(trainers.error))}
        </Text>
        <Button label={t("common.retry")} onPress={() => void trainers.refetch()} />
      </Screen>
    );
  }
  if (trainers.data.items.length === 0) {
    return (
      <Screen belowHeader>
        <Text style={fieldStyles.value}>{t("groupForm.trainersEmpty")}</Text>
      </Screen>
    );
  }

  return (
    <Screen belowHeader>
      <OptionList
        label={t("groupForm.owner")}
        options={trainers.data.items.map((trainer) => ({ value: trainer.id, label: formatSortedName(trainer) }))}
        selected={draft.ownerId}
        onSelect={(ownerId) => update({ ownerId })}
        error={fieldError("ownerId")}
      />
      <CheckboxList
        label={t("groupForm.days")}
        options={weekday.options.map((day) => ({ value: day, label: t(weekdayKey(day)) }))}
        selected={draft.days}
        onToggle={(day) => update({ days: toggleWeekday(draft.days, day) })}
        error={fieldError("days")}
      />
      <TimeField
        testID="from-picker"
        label={t("groupForm.from")}
        value={draft.from}
        onChange={(from) => update({ from })}
        formatValue={formatTimeOfDay}
        placeholder={t("groupForm.timePlaceholder")}
        initialTime={INITIAL_FROM}
        error={fieldError("from")}
      />
      <TimeField
        testID="to-picker"
        label={t("groupForm.to")}
        value={draft.to}
        onChange={(to) => update({ to })}
        formatValue={formatTimeOfDay}
        placeholder={t("groupForm.timePlaceholder")}
        initialTime={draft.from || INITIAL_TO}
        error={fieldError("to")}
      />

      {formError ? (
        <Text style={styles.formError} accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}

      <Button
        label={createGroup.isPending ? t("groupForm.submitting") : t("groupForm.submit")}
        onPress={save}
        disabled={createGroup.isPending}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  formError: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderLeftWidth: spacing[1],
    borderLeftColor: colors.red,
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
