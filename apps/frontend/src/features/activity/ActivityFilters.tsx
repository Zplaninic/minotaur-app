import { auditAction } from "@repo/shared";
import { useAuditActors } from "../../api/auditEvents";
import { Button } from "../../components/Button";
import { SelectField } from "../../components/SelectField";
import { TextField } from "../../components/TextField";
import { formatPersonName } from "../../lib/format";
import { auditActionKey, useMessages } from "../../lib/messages";
import styles from "./ActivityFilters.module.css";

// Empty strings mean no filter. fromDay and toDay are YYYY-MM-DD, both included.
export type ActivityFilterValues = { actorId: string; action: string; fromDay: string; toDay: string };

export const NO_ACTIVITY_FILTERS: ActivityFilterValues = { actorId: "", action: "", fromDay: "", toDay: "" };

export const hasActivityFilters = (values: ActivityFilterValues): boolean =>
  Object.values(values).some((value) => value !== "");

type ActivityFiltersProps = {
  values: ActivityFilterValues;
  onChange: (values: ActivityFilterValues) => void;
};

export const ActivityFilters = ({ values, onChange }: ActivityFiltersProps) => {
  const { t } = useMessages();
  const actors = useAuditActors();
  const set = (field: keyof ActivityFilterValues) => (value: string) => onChange({ ...values, [field]: value });

  return (
    <fieldset className={styles.filters}>
      <legend className={styles.legend}>{t("activity.filters.label")}</legend>
      <SelectField
        label={t("activity.filters.actor")}
        value={values.actorId}
        onChange={set("actorId")}
        placeholder={t("activity.filters.anyActor")}
        options={(actors.data ?? []).map((actor) => ({ value: actor.id, label: formatPersonName(actor) }))}
      />
      <SelectField
        label={t("activity.filters.action")}
        value={values.action}
        onChange={set("action")}
        placeholder={t("activity.filters.anyAction")}
        options={auditAction.options.map((action) => ({ value: action, label: t(auditActionKey(action)) }))}
      />
      <TextField
        label={t("activity.filters.from")}
        type="date"
        value={values.fromDay}
        onChange={set("fromDay")}
        max={values.toDay || undefined}
        optional
      />
      <TextField
        label={t("activity.filters.to")}
        type="date"
        value={values.toDay}
        onChange={set("toDay")}
        min={values.fromDay || undefined}
        optional
      />
      {hasActivityFilters(values) ? (
        <div className={styles.clear}>
          <Button variant="secondary" onClick={() => onChange(NO_ACTIVITY_FILTERS)}>
            {t("activity.filters.clear")}
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
};
