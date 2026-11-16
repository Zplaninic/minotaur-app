import { ADULT_AGE, MIN_BIRTHDAY, type MemberResponse } from "@repo/shared";
import { isLoginRole } from "@repo/shared/auth";
import {
  emptyMemberDraft,
  memberDraftFrom,
  newGuardianDraft,
  toErrorCode,
  toIsoDate,
  toUpdateMemberBody,
  validateMemberDraft,
  type GuardianDraft,
  type MemberDraft,
  type MemberFieldError,
} from "@repo/shared/client";
import { useState, type FormEvent } from "react";
import { useGuardians } from "../../api/guardians";
import { useCreateMember, useUpdateMember } from "../../api/members";
import { useOrgs } from "../../api/orgs";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FieldMessage } from "../../components/FieldMessage";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { errorMessage, memberFieldErrorKey, t } from "../../lib/messages";
import { GuardianFieldset } from "./GuardianFieldset";
import styles from "./MemberForm.module.css";

type MemberFormProps = {
  // Set to edit this member; without it the form adds a new one.
  member?: MemberResponse;
  onCancel: () => void;
  onSaved: () => void;
};

export const MemberForm = ({ member, onCancel, onSaved }: MemberFormProps) => {
  const orgs = useOrgs();
  const guardians = useGuardians();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember(member?.id ?? "");
  const save = member ? updateMember : createMember;
  const [draft, setDraft] = useState<MemberDraft>(() => (member ? memberDraftFrom(member) : emptyMemberDraft));
  const [submitted, setSubmitted] = useState(false);
  // Fixed for the life of the form, so the minor check does not change while typing.
  const [today] = useState(() => new Date());

  // With a single club there is nothing to choose, so it is preselected.
  const onlyOrg = orgs.data?.items.length === 1 ? orgs.data.items[0] : undefined;
  const effectiveDraft: MemberDraft = { ...draft, orgId: draft.orgId || (onlyOrg?.id ?? "") };
  // A trainer or admin logs in with their email, so it cannot be cleared.
  const emailRequired = member !== undefined && isLoginRole(member.role);
  const validation = validateMemberDraft(effectiveDraft, today, { emailRequired });
  const errors = submitted && !validation.ok ? validation.errors : {};
  const serverCode = save.error ? toErrorCode(save.error) : undefined;

  const message = (code: MemberFieldError | undefined) =>
    code ? t(memberFieldErrorKey(code), { age: ADULT_AGE }) : undefined;
  const fieldError = (path: string) => message(errors[path]);
  // A new member has no login, so a conflict is the tax number. An edited one
  // may be a trainer whose login email is taken.
  const taxNumberError =
    fieldError("taxNumber") ??
    (serverCode === "CONFLICT" && !member ? t("memberForm.error.taxNumberTaken") : undefined);
  const formError =
    serverCode === "CONFLICT"
      ? member
        ? t("memberForm.error.taken")
        : undefined
      : serverCode
        ? errorMessage(serverCode)
        : undefined;

  const update = (changes: Partial<MemberDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const updateGuardian = (index: number, guardian: GuardianDraft) =>
    setDraft((current) => ({ ...current, guardians: current.guardians.with(index, guardian) }));
  // The guardian waiting for "Remove" to be confirmed, by index.
  const [removingGuardian, setRemovingGuardian] = useState<number | undefined>();
  const removeGuardian = (index: number) => {
    setDraft((current) => ({ ...current, guardians: current.guardians.filter((_, i) => i !== index) }));
    setRemovingGuardian(undefined);
  };
  const addGuardian = () => {
    setDraft((current) => ({ ...current, guardians: [...current.guardians, newGuardianDraft(crypto.randomUUID())] }));
    // An empty guardian should not open with errors; they show again on the next save.
    setSubmitted(false);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) {
      return;
    }
    if (member) {
      updateMember.mutate(toUpdateMemberBody(validation.body), { onSuccess: onSaved });
    } else {
      createMember.mutate(validation.body, { onSuccess: onSaved });
    }
  };

  if (orgs.isPending) {
    return <output>{t("memberForm.orgsLoading")}</output>;
  }
  if (orgs.isError) {
    return (
      <div className={styles.form}>
        <p role="alert">{errorMessage(toErrorCode(orgs.error))}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void orgs.refetch()}>{t("common.retry")}</Button>
        </div>
      </div>
    );
  }
  if (orgs.data.items.length === 0) {
    return <p>{t("memberForm.orgsEmpty")}</p>;
  }

  const guardiansState = guardians.isPending ? "loading" : guardians.isError ? "error" : "ready";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.section}>
        <legend className={styles.sectionLegend}>{t("memberForm.member")}</legend>
        {onlyOrg || member ? null : (
          <SelectField
            label={t("memberForm.org")}
            placeholder={t("memberForm.orgPlaceholder")}
            value={effectiveDraft.orgId}
            onChange={(orgId) => update({ orgId })}
            options={orgs.data.items.map((org) => ({ value: org.id, label: org.name }))}
            error={fieldError("orgId")}
            required
          />
        )}
        <div className={styles.grid}>
          <TextField
            label={t("memberForm.name")}
            value={draft.name}
            onChange={(name) => update({ name })}
            error={fieldError("name")}
            autoComplete="off"
            required
          />
          <TextField
            label={t("memberForm.surname")}
            value={draft.surname}
            onChange={(surname) => update({ surname })}
            error={fieldError("surname")}
            autoComplete="off"
            required
          />
          <TextField
            label={t("memberForm.birthday")}
            type="date"
            value={draft.birthday}
            onChange={(birthday) => update({ birthday })}
            error={fieldError("birthday")}
            min={MIN_BIRTHDAY}
            max={toIsoDate(today)}
            required
          />
          <TextField
            label={t("memberForm.taxNumber")}
            inputMode="numeric"
            maxLength={11}
            value={draft.taxNumber}
            onChange={(taxNumber) => {
              update({ taxNumber });
              save.reset();
            }}
            error={taxNumberError}
            autoComplete="off"
            optional
          />
          <TextField
            label={t("memberForm.email")}
            type="email"
            value={draft.email}
            onChange={(email) => update({ email })}
            error={fieldError("email")}
            autoComplete="off"
            optional={!emailRequired}
            required={emailRequired}
          />
          <TextField
            label={t("memberForm.phone")}
            type="tel"
            inputMode="tel"
            value={draft.phone}
            onChange={(phone) => update({ phone })}
            error={fieldError("phone")}
            autoComplete="off"
            optional
          />
        </div>
      </fieldset>

      <fieldset className={styles.section} aria-describedby="guardians-hint">
        <legend className={styles.sectionLegend}>{t("memberForm.guardians")}</legend>
        <p id="guardians-hint" className={styles.hint}>
          {t("memberForm.guardiansHint", { age: ADULT_AGE })}
        </p>
        {guardians.isError && draft.guardians.some((guardian) => guardian.kind === "existing") ? (
          <p role="alert">{errorMessage(toErrorCode(guardians.error))}</p>
        ) : null}
        {draft.guardians.map((guardian, index) => (
          <GuardianFieldset
            key={guardian.key}
            index={index}
            guardian={guardian}
            onChange={(changed) => updateGuardian(index, changed)}
            onRemove={() => setRemovingGuardian(index)}
            errorFor={(field) => fieldError(`guardians.${index}.${field}`)}
            existingGuardians={guardians.data?.items}
            existingState={guardiansState}
          />
        ))}
        <FieldMessage id="guardians-error" error={fieldError("guardians")} />
        <div>
          <Button variant="secondary" onClick={addGuardian}>
            {t("memberForm.guardianAdd")}
          </Button>
        </div>
      </fieldset>

      <ConfirmDialog
        open={removingGuardian !== undefined}
        title={t("memberForm.guardianRemoveConfirmTitle", { number: (removingGuardian ?? 0) + 1 })}
        message={t("memberForm.guardianRemoveConfirmText")}
        confirmLabel={t("common.remove")}
        onConfirm={() => removingGuardian !== undefined && removeGuardian(removingGuardian)}
        onCancel={() => setRemovingGuardian(undefined)}
      />

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
          {save.isPending ? t("memberForm.submitting") : t(member ? "memberForm.saveChanges" : "memberForm.submit")}
        </Button>
      </div>
    </form>
  );
};
