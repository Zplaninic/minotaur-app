import { weekday, type GroupResponse } from "@repo/shared";
import {
  emptyGroupDraft,
  groupToDraft,
  toErrorCode,
  toggleWeekday,
  validateGroupDraft,
  type GroupDraft,
} from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useSaveGroup } from "../../api/groups";
import { useTrainers } from "../../api/members";
import { Button } from "../../components/Button";
import { CheckboxGroup } from "../../components/CheckboxGroup";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { formatPersonName } from "../../lib/format";
import { groupFieldErrorKey, useMessages, weekdayKey } from "../../lib/messages";
import styles from "./GroupForm.module.css";
import { LoadingState } from "../../components/LoadingState";

type GroupFormProps = {
  // The group to edit; without one the form adds a new group.
  group?: GroupResponse | undefined;
  onCancel: () => void;
  onSaved: () => void;
};

export const GroupForm = ({ group, onCancel, onSaved }: GroupFormProps) => {
  const { errorMessage, t } = useMessages();
  const trainers = useTrainers();
  const saveGroup = useSaveGroup(group?.id);
  const [draft, setDraft] = useState<GroupDraft>(() => (group ? groupToDraft(group) : emptyGroupDraft));
  const [submitted, setSubmitted] = useState(false);

  const validation = validateGroupDraft(draft);
  const errors = submitted && !validation.ok ? validation.errors : {};
  const fieldError = (field: string) => {
    const code = errors[field];
    return code ? t(groupFieldErrorKey(code)) : undefined;
  };
  const formError = saveGroup.error ? errorMessage(toErrorCode(saveGroup.error)) : undefined;

  const update = (changes: Partial<GroupDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validation.ok) {
      saveGroup.mutate(validation.body, { onSuccess: onSaved });
    }
  };

  if (trainers.isPending) {
    return <LoadingState label={t("groupForm.trainersLoading")} />;
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
        options={trainers.data.items.map((trainer) => ({ value: trainer.id, label: formatPersonName(trainer) }))}
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
      <div className={styles.grid}>
        <TextField
          label={t("groupForm.ageFrom")}
          inputMode="numeric"
          autoComplete="off"
          value={draft.ageFrom}
          onChange={(ageFrom) => update({ ageFrom })}
          error={fieldError("ageFrom")}
          optional
        />
        <TextField
          label={t("groupForm.ageTo")}
          inputMode="numeric"
          autoComplete="off"
          value={draft.ageTo}
          onChange={(ageTo) => update({ ageTo })}
          error={fieldError("ageTo")}
          optional
        />
      </div>
      <div className={styles.grid}>
        <TextField
          label={t("groupForm.maxMembers")}
          inputMode="numeric"
          autoComplete="off"
          value={draft.maxMembers}
          onChange={(maxMembers) => update({ maxMembers })}
          error={fieldError("maxMembers")}
          optional
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
        <Button type="submit" pending={saveGroup.isPending}>
          {saveGroup.isPending ? t("groupForm.submitting") : t("groupForm.submit")}
        </Button>
      </div>
    </form>
  );
};
