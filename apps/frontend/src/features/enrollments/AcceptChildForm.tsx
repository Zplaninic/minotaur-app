import type { EnrollmentChildResponse, EnrollmentRequestResponse, GroupResponse } from "@repo/shared";
import {
  acceptEnrollmentDraft,
  validateAcceptEnrollmentDraft,
  type AcceptEnrollmentDraft,
} from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useAcceptEnrollmentChild } from "../../api/enrollmentRequests";
import { Button } from "../../components/Button";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { acceptFieldErrorKey, useMessages } from "../../lib/messages";
import styles from "./AcceptChildForm.module.css";
import { enrollmentActionError } from "./enrollmentActionError";
import { groupOptions, type WaitingByGroup } from "./groupOptions";

type AcceptChildFormProps = {
  request: EnrollmentRequestResponse;
  child: EnrollmentChildResponse;
  groups: readonly GroupResponse[];
  waitingByGroup: WaitingByGroup;
  onCancel: () => void;
  onAccepted: () => void;
};

// Confirms the child's surname and group, then makes the child a member.
export const AcceptChildForm = ({
  request,
  child,
  groups,
  waitingByGroup,
  onCancel,
  onAccepted,
}: AcceptChildFormProps) => {
  const { errorMessage, t } = useMessages();
  const accept = useAcceptEnrollmentChild(request.id, child.id);
  const [draft, setDraft] = useState<AcceptEnrollmentDraft>(() => acceptEnrollmentDraft(request, child));
  const [submitted, setSubmitted] = useState(false);

  const validation = validateAcceptEnrollmentDraft(draft);
  const errors = submitted && !validation.ok ? validation.errors : {};
  const fieldError = (field: keyof AcceptEnrollmentDraft) => {
    const code = errors[field];
    return code ? t(acceptFieldErrorKey(code)) : undefined;
  };
  const update = (changes: Partial<AcceptEnrollmentDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validation.ok) {
      accept.mutate(validation.body, { onSuccess: onAccepted });
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <p>{t("acceptForm.intro", { name: child.name })}</p>
      <TextField
        label={t("acceptForm.surname")}
        value={draft.surname}
        onChange={(surname) => update({ surname })}
        error={fieldError("surname")}
        autoComplete="off"
        required
      />
      <SelectField
        label={t("acceptForm.group")}
        placeholder={t("enrollments.groupPlaceholder")}
        value={draft.groupId}
        onChange={(groupId) => update({ groupId })}
        options={groupOptions(groups, waitingByGroup, t)}
        error={fieldError("groupId")}
        required
      />

      {accept.error ? (
        <p role="alert" className={styles.formError}>
          {enrollmentActionError(accept.error, t, errorMessage)}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" pending={accept.isPending}>
          {accept.isPending ? t("acceptForm.submitting") : t("acceptForm.submit")}
        </Button>
      </div>
    </form>
  );
};
