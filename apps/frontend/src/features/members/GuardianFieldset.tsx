import type { GuardianResponse } from "@repo/shared";
import type { GuardianDraft } from "@repo/shared/client";
import { Button } from "../../components/Button";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { formatSortedName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./MemberForm.module.css";

type GuardianFieldsetProps = {
  index: number;
  guardian: GuardianDraft;
  onChange: (guardian: GuardianDraft) => void;
  onRemove: () => void;
  errorFor: (field: string) => string | undefined;
  existingGuardians: readonly GuardianResponse[] | undefined;
  existingState: "loading" | "error" | "ready";
};

export const GuardianFieldset = ({
  index,
  guardian,
  onChange,
  onRemove,
  errorFor,
  existingGuardians,
  existingState,
}: GuardianFieldsetProps) => {
  const { t } = useMessages();
  const number = index + 1;
  const update = (changes: Partial<GuardianDraft>) => onChange({ ...guardian, ...changes });

  return (
    <fieldset className={styles.guardian}>
      <legend className={styles.guardianLegend}>{t("memberForm.guardianNumber", { number })}</legend>

      <div className={styles.kindRow}>
        {(["new", "existing"] as const).map((kind) => (
          <label key={kind} className={styles.kind}>
            <input
              type="radio"
              name={`guardian-kind-${guardian.key}`}
              value={kind}
              checked={guardian.kind === kind}
              onChange={() => update({ kind })}
            />
            {t(kind === "new" ? "memberForm.guardianNew" : "memberForm.guardianExisting")}
          </label>
        ))}
      </div>

      {guardian.kind === "existing" ? (
        existingState === "loading" ? (
          <output>{t("memberForm.guardiansLoading")}</output>
        ) : existingState === "error" || !existingGuardians ? null : existingGuardians.length === 0 ? (
          <p>{t("memberForm.guardiansEmpty")}</p>
        ) : (
          <SelectField
            label={t("memberForm.guardianPick")}
            placeholder={t("memberForm.guardianPlaceholder")}
            value={guardian.guardianId}
            onChange={(guardianId) => update({ guardianId })}
            options={existingGuardians.map((existing) => ({ value: existing.id, label: formatSortedName(existing) }))}
            error={errorFor("guardianId")}
            required
          />
        )
      ) : (
        <div className={styles.grid}>
          <TextField
            label={t("memberForm.name")}
            value={guardian.name}
            onChange={(name) => update({ name })}
            error={errorFor("name")}
            autoComplete="off"
            required
          />
          <TextField
            label={t("memberForm.surname")}
            value={guardian.surname}
            onChange={(surname) => update({ surname })}
            error={errorFor("surname")}
            autoComplete="off"
            required
          />
          <TextField
            label={t("memberForm.email")}
            type="email"
            value={guardian.email}
            onChange={(email) => update({ email })}
            error={errorFor("email")}
            autoComplete="off"
            optional
          />
          <TextField
            label={t("memberForm.phone")}
            type="tel"
            inputMode="tel"
            value={guardian.phone}
            onChange={(phone) => update({ phone })}
            error={errorFor("phone")}
            autoComplete="off"
            optional
          />
        </div>
      )}

      <div>
        <Button variant="secondary" onClick={onRemove}>
          {t("memberForm.guardianRemove", { number })}
        </Button>
      </div>
    </fieldset>
  );
};
