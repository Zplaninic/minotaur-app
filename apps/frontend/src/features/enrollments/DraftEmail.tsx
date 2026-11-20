import type { EnrollmentRequestResponse, GroupResponse } from "@repo/shared";
import { useId, useState } from "react";
import { Button } from "../../components/Button";
import fieldStyles from "../../components/Field.module.css";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { isLanguage, LANGUAGES, type Language } from "../../lib/i18n";
import { useMessages } from "../../lib/messages";
import styles from "./DraftEmail.module.css";
import { enrollmentEmail, mailtoHref, type EnrollmentEmail } from "./enrollmentEmail";

type DraftEmailProps = {
  request: EnrollmentRequestResponse;
  groups: readonly GroupResponse[];
  onClose: () => void;
};

type CopyState = "idle" | "copied" | "failed";

// Parents are written to in Croatian unless the admin picks otherwise.
const DEFAULT_EMAIL_LANGUAGE: Language = "hr";

// The reply filled from the template, to review and edit before sending.
// Nothing is sent from the app: copy it or open it in the mail app.
export const DraftEmail = ({ request, groups, onClose }: DraftEmailProps) => {
  const { t } = useMessages();
  const bodyId = useId();
  const [language, setLanguage] = useState<Language>(DEFAULT_EMAIL_LANGUAGE);
  // Starts from the template; after that the text is the admin's until they
  // pick another language, which fills the template again.
  const [email, setEmail] = useState<EnrollmentEmail>(() =>
    enrollmentEmail(request, groups, DEFAULT_EMAIL_LANGUAGE),
  );
  const [copy, setCopy] = useState<CopyState>("idle");
  const update = (changes: Partial<EnrollmentEmail>) => {
    setEmail((current) => ({ ...current, ...changes }));
    setCopy("idle");
  };

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(email.body);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  const changeLanguage = (value: string) => {
    if (isLanguage(value)) {
      setLanguage(value);
      // The address may have been typed in; the text is rebuilt in the new language.
      setEmail((current) => ({ ...enrollmentEmail(request, groups, value), to: current.to }));
      setCopy("idle");
    }
  };

  return (
    <div className={styles.form}>
      <SelectField
        label={t("draftEmail.language")}
        placeholder={t("draftEmail.languagePlaceholder")}
        value={language}
        onChange={changeLanguage}
        options={LANGUAGES.map((option) => ({ value: option, label: t(`language.${option}`) }))}
        required
      />
      <TextField
        label={t("draftEmail.to")}
        value={email.to}
        onChange={(to) => update({ to })}
        type="email"
        autoComplete="off"
      />
      <TextField
        label={t("draftEmail.subject")}
        value={email.subject}
        onChange={(subject) => update({ subject })}
        autoComplete="off"
      />
      <div className={fieldStyles.field}>
        <label htmlFor={bodyId} className={fieldStyles.label}>
          {t("draftEmail.body")}
        </label>
        <textarea
          id={bodyId}
          className={`${fieldStyles.control} ${styles.body}`}
          value={email.body}
          onChange={(event) => update({ body: event.target.value })}
          rows={14}
        />
      </div>

      <output className={styles.copyState}>
        {copy === "copied" ? t("draftEmail.copied") : copy === "failed" ? t("draftEmail.copyFailed") : null}
      </output>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button variant="secondary" onClick={() => void copyBody()}>
          {t("draftEmail.copy")}
        </Button>
        <a className={styles.mailLink} href={mailtoHref(email)}>
          {t("draftEmail.open")}
        </a>
      </div>
    </div>
  );
};
