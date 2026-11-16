import { MAX_SESSIONS_PER_WEEK, MIN_SESSIONS_PER_WEEK, type SubscriptionResponse } from "@repo/shared";
import {
  emptySubscriptionDraft,
  subscriptionToDraft,
  toErrorCode,
  validateSubscriptionDraft,
  type SubscriptionDraft,
} from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useCreateSubscription, useUpdateSubscription } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { formatNumber } from "../../lib/format";
import { errorMessage, subscriptionFieldErrorKey, t } from "../../lib/messages";
import styles from "./SubscriptionForm.module.css";

const sessionOptions = Array.from({ length: MAX_SESSIONS_PER_WEEK - MIN_SESSIONS_PER_WEEK + 1 }, (_, index) => {
  const count = MIN_SESSIONS_PER_WEEK + index;
  return { value: String(count), label: formatNumber(count) };
});

type SubscriptionFormProps = {
  // Edits this subscription; without it the form adds a new one.
  subscription?: SubscriptionResponse;
  onCancel: () => void;
  onSaved: () => void;
};

export const SubscriptionForm = ({ subscription, onCancel, onSaved }: SubscriptionFormProps) => {
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validation.ok) {
      save.mutate(validation.body, { onSuccess: onSaved });
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <TextField
        label={t("subscriptionForm.name")}
        value={draft.name}
        onChange={(name) => update({ name })}
        error={nameError}
        autoComplete="off"
        required
      />
      <div className={styles.grid}>
        <SelectField
          label={t("subscriptionForm.sessionsPerWeek")}
          placeholder={t("subscriptionForm.sessionsPerWeekPlaceholder")}
          value={draft.sessionsPerWeek}
          onChange={(sessionsPerWeek) => update({ sessionsPerWeek })}
          options={sessionOptions}
          error={fieldError("sessionsPerWeek")}
          required
        />
        <TextField
          label={t("subscriptionForm.price")}
          value={draft.price}
          onChange={(price) => update({ price })}
          error={fieldError("price")}
          inputMode="decimal"
          autoComplete="off"
          required
        />
      </div>

      {formError ? (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t("subscriptionForm.submitting") : t("subscriptionForm.submit")}
        </Button>
      </div>
    </form>
  );
};
