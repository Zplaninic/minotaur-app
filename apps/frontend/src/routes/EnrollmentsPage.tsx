import type { EnrollmentRequestState } from "@repo/shared";
import { useState } from "react";
import { useAbility } from "../api/auth";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { AddEnrollmentRequest } from "../features/enrollments/AddEnrollmentRequest";
import { EnrollmentRequestList } from "../features/enrollments/EnrollmentRequestList";
import { enrollmentStateKey, useMessages } from "../lib/messages";
import styles from "./EnrollmentsPage.module.css";

const STATES: readonly EnrollmentRequestState[] = ["open", "closed", "rejected"];

export const EnrollmentsPage = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const [state, setState] = useState<EnrollmentRequestState>("open");
  const [adding, setAdding] = useState(false);
  const close = () => setAdding(false);

  if (!ability.can("read", "EnrollmentRequest")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("enrollments.title")}</h1>
        {ability.can("create", "EnrollmentRequest") ? (
          <Button onClick={() => setAdding(true)}>{t("enrollments.add")}</Button>
        ) : null}
      </div>
      <fieldset className={styles.states}>
        <legend className={styles.hiddenLegend}>{t("enrollments.show")}</legend>
        {STATES.map((option) => (
          <Button
            key={option}
            variant={option === state ? "primary" : "secondary"}
            aria-pressed={option === state}
            onClick={() => setState(option)}
          >
            {t(enrollmentStateKey(option))}
          </Button>
        ))}
      </fieldset>
      {/* Keyed by state, so each list starts on its first page. */}
      <EnrollmentRequestList key={state} state={state} />
      <Dialog open={adding} onClose={close} title={t("enrollmentForm.title")}>
        {adding ? <AddEnrollmentRequest onCancel={close} onSaved={close} /> : null}
      </Dialog>
    </div>
  );
};
