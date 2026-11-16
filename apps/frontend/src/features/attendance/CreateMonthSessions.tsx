import type { Month, Weekday } from "@repo/shared";
import { canCreateSessionsIn, toErrorCode } from "@repo/shared/client";
import { useAbility } from "../../api/auth";
import { useCreateMonthSessions } from "../../api/attendance";
import { Button } from "../../components/Button";
import { formatMonth } from "../../lib/format";
import { errorMessage, t, weekdayKey } from "../../lib/messages";
import styles from "./Attendance.module.css";

type CreateMonthSessionsProps = {
  groupId: string;
  month: Month;
  days: readonly Weekday[];
  today: string;
};

// The empty state of a month: fill in its sessions from the group's days.
export const CreateMonthSessions = ({ groupId, month, days, today }: CreateMonthSessionsProps) => {
  const ability = useAbility();
  const createSessions = useCreateMonthSessions(groupId);
  const canCreate = ability.can("create", "Attendance");
  const allowedMonth = canCreateSessionsIn(month, today);

  return (
    <div className={styles.state}>
      <p>{t("attendance.noSessions", { month: formatMonth(month) })}</p>
      {createSessions.error ? (
        <p role="alert" className={styles.error}>
          {errorMessage(toErrorCode(createSessions.error))}
        </p>
      ) : null}
      {canCreate && !allowedMonth ? (
        <p>{t("attendance.createOnlyNearMonths")}</p>
      ) : null}
      {canCreate && allowedMonth ? (
        <div>
          <Button onClick={() => createSessions.mutate(month)} disabled={createSessions.isPending}>
            {createSessions.isPending
              ? t("attendance.creatingSessions")
              : t("attendance.createSessions", { days: days.map((day) => t(weekdayKey(day))).join(", ") })}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
