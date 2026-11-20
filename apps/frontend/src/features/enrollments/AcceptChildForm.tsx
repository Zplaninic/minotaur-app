import type { EnrollmentChildResponse, EnrollmentRequestResponse, GroupResponse } from "@repo/shared";
import {
  acceptEnrollmentDraft,
  toErrorCode,
  validateAcceptEnrollmentDraft,
  type AcceptEnrollmentDraft,
} from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useAcceptEnrollmentChild } from "../../api/enrollmentRequests";
import { useOrgs } from "../../api/orgs";
import { Button } from "../../components/Button";
import { LoadingState } from "../../components/LoadingState";
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
  const orgs = useOrgs();
  const accept = useAcceptEnrollmentChild(request.id, child.id);
  const [draft, setDraft] = useState<AcceptEnrollmentDraft>(() => acceptEnrollmentDraft(request, child, ""));
  const [submitted, setSubmitted] = useState(false);

  if (orgs.isPending) {
    return <LoadingState label={t("memberForm.orgsLoading")} />;
  }
  if (orgs.isError) {
    return (
      <div className={styles.form}>
        <p role="alert">{errorMessage(toErrorCode(orgs.error))}</p>
        <div className={styles.actions}>
          <Button onClick={() => void orgs.refetch()}>{t("common.retry")}</Button>
        </div>
      </div>
    );
  }
  if (orgs.data.items.length === 0) {
    return <p>{t("memberForm.orgsEmpty")}</p>;
  }

  const onlyOrg = orgs.data.items.length === 1 ? orgs.data.items[0] : undefined;
  const effective: AcceptEnrollmentDraft = { ...draft, orgId: draft.orgId || (onlyOrg?.id ?? "") };
  const validation = validateAcceptEnrollmentDraft(effective);
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
      {onlyOrg ? null : (
        <SelectField
          label={t("memberForm.org")}
          placeholder={t("memberForm.orgPlaceholder")}
          value={effective.orgId}
          onChange={(orgId) => update({ orgId })}
          options={orgs.data.items.map((org) => ({ value: org.id, label: org.name }))}
          error={fieldError("orgId")}
          required
        />
      )}
      <TextField
        label={t("acceptForm.surname")}
        value={effective.surname}
        onChange={(surname) => update({ surname })}
        error={fieldError("surname")}
        autoComplete="off"
        required
      />
      <SelectField
        label={t("acceptForm.group")}
        placeholder={t("enrollments.groupPlaceholder")}
        value={effective.groupId}
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
