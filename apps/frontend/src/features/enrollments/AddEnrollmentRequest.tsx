import type { ParseProblem } from "@repo/enrollment";
import {
  emptyEnrollmentRequestDraft,
  newEnrollmentChildDraft,
  toErrorCode,
  validateEnrollmentDraft,
  type EnrollmentChildDraft,
  type EnrollmentRequestDraft,
} from "@repo/shared/client";
import { useId, useRef, useState, type FormEvent } from "react";
import { useCreateEnrollmentRequest } from "../../api/enrollmentRequests";
import { Button } from "../../components/Button";
import fieldStyles from "../../components/Field.module.css";
import { TextField } from "../../components/TextField";
import { enrollmentFieldErrorKey, enrollmentProblemKey, useMessages } from "../../lib/messages";
import styles from "./AddEnrollmentRequest.module.css";
import { enrollmentDraftFromEmail } from "./enrollmentDraftFromEmail";

type AddEnrollmentRequestProps = {
  onCancel: () => void;
  onSaved: () => void;
};

// Paste the form email to fill the fields, check them, then save.
export const AddEnrollmentRequest = ({ onCancel, onSaved }: AddEnrollmentRequestProps) => {
  const { errorMessage, t } = useMessages();
  const save = useCreateEnrollmentRequest();
  const emailId = useId();
  const keyCounter = useRef(1);
  const nextKey = () => {
    keyCounter.current += 1;
    return `child-${keyCounter.current}`;
  };
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<EnrollmentRequestDraft>(() => emptyEnrollmentRequestDraft("child-1"));
  const [problems, setProblems] = useState<ParseProblem[] | undefined>();
  const [submitted, setSubmitted] = useState(false);

  // The original email is what is in the box when saving, even if edited after reading it.
  const validation = validateEnrollmentDraft({ ...draft, rawText: email });
  const errors = submitted && !validation.ok ? validation.errors : {};
  const fieldError = (path: string) => {
    const code = errors[path];
    return code ? t(enrollmentFieldErrorKey(code)) : undefined;
  };

  const update = (changes: Partial<EnrollmentRequestDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const updateChild = (key: string, changes: Partial<EnrollmentChildDraft>) =>
    setDraft((current) => ({
      ...current,
      children: current.children.map((child) => (child.key === key ? { ...child, ...changes } : child)),
    }));

  const readEmail = () => {
    const result = enrollmentDraftFromEmail(email, nextKey);
    setDraft(result.draft);
    setProblems(result.problems);
    setSubmitted(false);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validation.ok) {
      save.mutate(validation.body, { onSuccess: onSaved });
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={fieldStyles.field}>
        <label htmlFor={emailId} className={fieldStyles.label}>
          {t("enrollmentForm.email")}
        </label>
        <textarea
          id={emailId}
          className={`${fieldStyles.control} ${styles.email}`}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          rows={8}
        />
        <div>
          <Button variant="secondary" onClick={readEmail} disabled={email.trim() === ""}>
            {t("enrollmentForm.read")}
          </Button>
        </div>
      </div>

      {problems === undefined ? null : (
        <div className={problems.length > 0 ? styles.problems : styles.readOk} aria-live="polite">
          {problems.length > 0 ? (
            <>
              <p>{t("enrollmentForm.problemsIntro")}</p>
              <ul>
                {problems.map((problem) => (
                  <li key={`${problem.field}-${problem.code}`}>{t(enrollmentProblemKey(problem))}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>{t("enrollmentForm.readOk")}</p>
          )}
        </div>
      )}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("enrollmentForm.parent")}</legend>
        <div className={styles.grid}>
          <TextField
            label={t("enrollmentForm.parentName")}
            value={draft.parentName}
            onChange={(parentName) => update({ parentName })}
            error={fieldError("parentName")}
            autoComplete="off"
            required
          />
          <TextField
            label={t("enrollmentForm.parentSurname")}
            value={draft.parentSurname}
            onChange={(parentSurname) => update({ parentSurname })}
            error={fieldError("parentSurname")}
            autoComplete="off"
            optional
          />
          <TextField
            label={t("enrollmentForm.parentPhone")}
            value={draft.parentPhone}
            onChange={(parentPhone) => update({ parentPhone })}
            error={fieldError("parentPhone")}
            type="tel"
            autoComplete="off"
            optional
          />
          <TextField
            label={t("enrollmentForm.parentEmail")}
            value={draft.parentEmail}
            onChange={(parentEmail) => update({ parentEmail })}
            error={fieldError("parentEmail")}
            type="email"
            autoComplete="off"
            optional
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("enrollmentForm.children")}</legend>
        {fieldError("children") ? (
          <p role="alert" className={fieldStyles.error}>
            {fieldError("children")}
          </p>
        ) : null}
        <ol className={styles.children}>
          {draft.children.map((child, index) => (
            <li key={child.key} className={styles.child}>
              <TextField
                label={t("enrollmentForm.childName", { number: index + 1 })}
                value={child.name}
                onChange={(name) => updateChild(child.key, { name })}
                error={fieldError(`children.${index}.name`)}
                autoComplete="off"
                required
              />
              <TextField
                label={t("enrollmentForm.childAge", { number: index + 1 })}
                value={child.age}
                onChange={(age) => updateChild(child.key, { age })}
                error={fieldError(`children.${index}.age`)}
                inputMode="decimal"
                autoComplete="off"
                required
              />
              <div className={styles.removeChild}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    update({ children: draft.children.filter((other) => other.key !== child.key) })
                  }
                  aria-label={t("enrollmentForm.removeChild", { number: index + 1 })}
                  disabled={draft.children.length === 1}
                >
                  {t("common.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <div>
          <Button
            variant="secondary"
            onClick={() => update({ children: [...draft.children, newEnrollmentChildDraft(nextKey())] })}
          >
            {t("enrollmentForm.addChild")}
          </Button>
        </div>
      </fieldset>

      {save.error ? (
        <p role="alert" className={styles.formError}>
          {toErrorCode(save.error) === "CONFLICT"
            ? t("enrollmentForm.error.duplicate")
            : errorMessage(toErrorCode(save.error))}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" pending={save.isPending}>
          {save.isPending ? t("enrollmentForm.submitting") : t("enrollmentForm.submit")}
        </Button>
      </div>
    </form>
  );
};
