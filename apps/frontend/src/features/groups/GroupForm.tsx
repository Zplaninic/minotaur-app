import { weekday } from "@repo/shared";
import {
  emptyGroupDraft,
  toErrorCode,
  toggleWeekday,
  validateGroupDraft,
  type GroupDraft,
} from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useCreateGroup } from "../../api/groups";
import { useTrainers } from "../../api/members";
import { Button } from "../../components/Button";
import { CheckboxGroup } from "../../components/CheckboxGroup";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { formatSortedName } from "../../lib/format";
import { errorMessage, groupFieldErrorKey, t, weekdayKey } from "../../lib/messages";
import styles from "./GroupForm.module.css";

type GroupFormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

export const GroupForm = ({ onCancel, onSaved }: GroupFormProps) => {
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validation.ok) {
      createGroup.mutate(validation.body, { onSuccess: onSaved });
    }
  };

  if (trainers.isPending) {
    return <output>{t("groupForm.trainersLoading")}</output>;
  }
  if (trainers.isError) {
    return (
      <div className={styles.form}>
        <p role="alert">{errorMessage(toErrorCode(trainers.error))}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void trainers.refetch()}>{t("common.retry")}</Button>
        </div>
      </div>
    );
  }
  if (trainers.data.items.length === 0) {
    return <p>{t("groupForm.trainersEmpty")}</p>;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <SelectField
        label={t("groupForm.owner")}
        placeholder={t("groupForm.ownerPlaceholder")}
        value={draft.ownerId}
        onChange={(ownerId) => update({ ownerId })}
        options={trainers.data.items.map((trainer) => ({ value: trainer.id, label: formatSortedName(trainer) }))}
        error={fieldError("ownerId")}
        required
      />
      <CheckboxGroup
        legend={t("groupForm.days")}
        options={weekday.options.map((day) => ({ value: day, label: t(weekdayKey(day)) }))}
        selected={draft.days}
        onToggle={(day) => update({ days: toggleWeekday(draft.days, day) })}
        error={fieldError("days")}
      />
      <div className={styles.grid}>
        <TextField
          label={t("groupForm.from")}
          type="time"
          value={draft.from}
          onChange={(from) => update({ from })}
          error={fieldError("from")}
          required
        />
        <TextField
          label={t("groupForm.to")}
          type="time"
          value={draft.to}
          onChange={(to) => update({ to })}
          error={fieldError("to")}
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
        <Button type="submit" disabled={createGroup.isPending}>
          {createGroup.isPending ? t("groupForm.submitting") : t("groupForm.submit")}
        </Button>
      </div>
    </form>
  );
};
