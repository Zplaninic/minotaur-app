import { MAX_SESSIONS_PER_WEEK, MIN_SESSIONS_PER_WEEK, type SubscriptionResponse } from "@repo/shared";
import {
  emptySubscriptionDraft,
  subscriptionToDraft,
  toErrorCode,
  validateSubscriptionDraft,
  type SubscriptionDraft,
} from "@repo/shared/client";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useCreateSubscription, useUpdateSubscription } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { OptionList } from "../../components/OptionList";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { formatNumber } from "../../lib/format";
import { subscriptionFieldErrorKey, useMessages } from "../../lib/messages";
import { bodyLineHeight, colors, fonts, fontSizes, radii, spacing } from "../../theme/tokens";

const sessionOptions = Array.from({ length: MAX_SESSIONS_PER_WEEK - MIN_SESSIONS_PER_WEEK + 1 }, (_, index) => {
  const count = MIN_SESSIONS_PER_WEEK + index;
  return { value: String(count), label: formatNumber(count) };
});

type SubscriptionFormScreenProps = {
  // Edits this subscription; without it the screen adds a new one.
  subscription?: SubscriptionResponse;
};

export const SubscriptionFormScreen = ({ subscription }: SubscriptionFormScreenProps) => {
  const { errorMessage, t } = useMessages();
  const router = useRouter();
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription(subscription?.id ?? "");
  const save = subscription ? updateSubscription : createSubscription;
  const [draft, setDraft] = useState<SubscriptionDraft>(() =>
    subscription ? subscriptionToDraft(subscription) : emptySubscriptionDraft,
  );
  const [submitted, setSubmitted] = useState(false);

  const validation = validateSubscriptionDraft(draft);
  const errors = submitted && !validation.ok ? validation.errors : {};
  const fieldError = (field: string) => {
    const code = errors[field];
    return code ? t(subscriptionFieldErrorKey(code)) : undefined;
  };
  const serverCode = save.error ? toErrorCode(save.error) : undefined;
  // The name is the only unique field, so a conflict belongs next to it.
  const nameError =
    fieldError("name") ?? (serverCode === "CONFLICT" ? t("subscriptionForm.error.nameTaken") : undefined);
  const formError = serverCode && serverCode !== "CONFLICT" ? errorMessage(serverCode) : undefined;

  const update = (changes: Partial<SubscriptionDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const onSave = () => {
    setSubmitted(true);
    if (validation.ok) {
      save.mutate(validation.body, { onSuccess: () => router.back() });
    }
  };

  return (
    <Screen belowHeader>
      <TextField
        label={t("subscriptionForm.name")}
        value={draft.name}
        onChangeText={(name) => update({ name })}
        error={nameError}
        autoCapitalize="sentences"
      />
      <OptionList
        label={t("subscriptionForm.sessionsPerWeek")}
        options={sessionOptions}
        selected={draft.sessionsPerWeek}
        onSelect={(sessionsPerWeek) => update({ sessionsPerWeek })}
        error={fieldError("sessionsPerWeek")}
      />
      <TextField
        label={t("subscriptionForm.price")}
        value={draft.price}
        onChangeText={(price) => update({ price })}
        error={fieldError("price")}
        keyboardType="decimal-pad"
        inputMode="decimal"
      />

      {formError ? (
        <Text style={styles.formError} accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}

      <Button
        label={save.isPending ? t("subscriptionForm.submitting") : t("subscriptionForm.submit")}
        onPress={onSave}
        pending={save.isPending}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  formError: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    overflow: "hidden",
    borderLeftWidth: spacing[1],
    borderLeftColor: colors.red,
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
