import { auditAction } from "@repo/shared";
import { dayRangeFilter, type AuditEventFilters } from "@repo/shared/client";
import { useState } from "react";
import { useAbility } from "../api/auth";
import {
  ActivityFilters,
  hasActivityFilters,
  NO_ACTIVITY_FILTERS,
  type ActivityFilterValues,
} from "../features/activity/ActivityFilters";
import { ActivityTable } from "../features/activity/ActivityTable";
import { useMessages } from "../lib/messages";
import styles from "./ActivityPage.module.css";

const toFilters = (values: ActivityFilterValues): AuditEventFilters => {
  const action = auditAction.safeParse(values.action);
  return {
    ...(values.actorId ? { actorId: values.actorId } : {}),
    ...(action.success ? { action: action.data } : {}),
    ...dayRangeFilter(values.fromDay, values.toDay),
  };
};

// Who did what in the system, newest first. Admins only.
export const ActivityPage = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const [values, setValues] = useState(NO_ACTIVITY_FILTERS);

  if (!ability.can("read", "AuditEvent")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page}>
      <h1>{t("activity.title")}</h1>
      <ActivityFilters values={values} onChange={setValues} />
      <ActivityTable filters={toFilters(values)} filtered={hasActivityFilters(values)} />
    </div>
  );
};
