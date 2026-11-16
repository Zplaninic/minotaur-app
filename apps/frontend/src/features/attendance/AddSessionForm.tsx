import { createTrainingSessionBody, type TrainingSessionResponse } from "@repo/shared";
import { ApiError, canCreateSessionsIn, sessionDateRange, toErrorCode } from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useAddTrainingSession } from "../../api/attendance";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { useMessages } from "../../lib/messages";
import styles from "../groups/GroupForm.module.css";

type AddSessionFormProps = {
  groupId: string;
  today: string;
  onCancel: () => void;
  onSaved: (session: TrainingSessionResponse) => void;
};

export const AddSessionForm = ({ groupId, today, onCancel, onSaved }: AddSessionFormProps) => {
  const { errorMessage, t } = useMessages();
  const addSession = useAddTrainingSession(groupId);
  const [date, setDate] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const parsed = createTrainingSessionBody.safeParse({ date });
  const inRange = parsed.success && canCreateSessionsIn(parsed.data.date.slice(0, 7), today);
  const range = sessionDateRange(today);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (parsed.success && inRange) {
      addSession.mutate(parsed.data.date, { onSuccess: onSaved });
    }
  };

  const conflict = addSession.error instanceof ApiError && addSession.error.code === "CONFLICT";
  const fieldError = !submitted
    ? undefined
    : !parsed.success
      ? t("sessionForm.error.date")
      : !inRange
        ? t("sessionForm.error.range")
        : undefined;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <TextField
        type="date"
        label={t("sessionForm.date")}
        value={date}
        onChange={(value) => {
          setDate(value);
          // "Already exists" was about the previous date.
          addSession.reset();
        }}
        min={range.min}
        max={range.max}
        error={conflict ? t("sessionForm.error.exists") : fieldError}
        required
      />

      {addSession.error && !conflict ? (
        <p role="alert" className={styles.formError}>
          {errorMessage(toErrorCode(addSession.error))}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={addSession.isPending}>
          {addSession.isPending ? t("sessionForm.submitting") : t("sessionForm.submit")}
        </Button>
      </div>
    </form>
  );
};
