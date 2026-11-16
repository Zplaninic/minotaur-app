import type { AttendanceMemberResponse, GroupAttendanceResponse, Month, TrainingSessionResponse } from "@repo/shared";
import { isFutureDate, memberHasAttendance, sessionHasAttendance, toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { useAbility } from "../../api/auth";
import { useDeleteTrainingSession, useRemoveMonthMember } from "../../api/attendance";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatMonth, formatPersonName, formatSessionDate, formatSortedName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { AttendanceCheckbox } from "./AttendanceCheckbox";
import { MonthPaidCheckbox } from "./MonthPaidCheckbox";
import { MonthSubscriptionSelect } from "./MonthSubscriptionSelect";
import { UnpaidBadge } from "./UnpaidBadge";
import styles from "./AttendanceGrid.module.css";

type AttendanceGridProps = {
  groupId: string;
  month: Month;
  data: GroupAttendanceResponse;
  today: string;
};

// Members × sessions of one month, like a sheet. Wide months scroll inside the box.
export const AttendanceGrid = ({ groupId, month, data, today }: AttendanceGridProps) => {
  const { errorMessage, t } = useMessages();
  const ability = useAbility();
  const deleteSession = useDeleteTrainingSession(groupId);
  const removeMember = useRemoveMonthMember(groupId, month);
  const canTick = ability.can("update", "Attendance");
  const canDelete = ability.can("delete", "Attendance");
  // What the open confirmation is about.
  const [confirming, setConfirming] = useState<
    { kind: "session"; session: TrainingSessionResponse } | { kind: "member"; member: AttendanceMemberResponse } | undefined
  >();
  const closeConfirm = () => {
    setConfirming(undefined);
    deleteSession.reset();
    removeMember.reset();
  };
  const confirmError = deleteSession.error ?? removeMember.error;

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>{t("attendance.table.caption", { month: formatMonth(month) })}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.name}>
                {t("attendance.table.name")}
              </th>
              <th scope="col" className={styles.subscription}>
                {t("attendance.table.subscription")}
              </th>
              <th scope="col" className={styles.paid}>
                {t("attendance.table.paid")}
              </th>
              {data.sessions.map((session) => (
                <th key={session.id} scope="col" className={styles.session}>
                  <span>{formatSessionDate(session.date)}</span>
                  {canDelete && !sessionHasAttendance(data, session.id) ? (
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => setConfirming({ kind: "session", session })}
                      aria-label={t("attendance.deleteSessionLabel", { date: formatSessionDate(session.date) })}
                    >
                      {t("attendance.deleteSession")}
                    </button>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.members.map((member) => (
              <tr key={member.id}>
                <th scope="row" className={styles.name}>
                  <span className={styles.memberName}>
                    <span className={styles.nameAndBadge}>
                      {formatSortedName(member)}
                      <UnpaidBadge memberId={member.id} />
                    </span>
                    {canTick && !memberHasAttendance(member) ? (
                      <button
                        type="button"
                        className={styles.delete}
                        onClick={() => setConfirming({ kind: "member", member })}
                        aria-label={t("attendance.removeMemberLabel", {
                          name: formatPersonName(member),
                          month: formatMonth(month),
                        })}
                      >
                        {t("attendance.removeMember")}
                      </button>
                    ) : null}
                  </span>
                </th>
                <td className={styles.subscription}>
                  <MonthSubscriptionSelect groupId={groupId} month={month} member={member} disabled={!canTick} />
                </td>
                <td className={styles.paid}>
                  <MonthPaidCheckbox groupId={groupId} month={month} member={member} disabled={!canTick} layout="cell" />
                </td>
                {data.sessions.map((session) => (
                  <td key={session.id}>
                    <AttendanceCheckbox
                      layout="cell"
                      groupId={groupId}
                      month={month}
                      sessionId={session.id}
                      memberId={member.id}
                      checked={member.attendedSessionIds.includes(session.id)}
                      disabled={!canTick || isFutureDate(session.date, today)}
                      label={t("attendance.checkboxLabel", {
                        name: formatPersonName(member),
                        date: formatSessionDate(session.date),
                      })}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={confirming !== undefined}
        title={
          confirming?.kind === "session"
            ? t("attendance.deleteSessionConfirmTitle", { date: formatSessionDate(confirming.session.date) })
            : confirming?.kind === "member"
              ? t("attendance.removeMemberConfirmTitle", {
                  name: formatPersonName(confirming.member),
                  month: formatMonth(month),
                })
              : ""
        }
        message={
          confirming?.kind === "session"
            ? t("attendance.deleteSessionConfirmText")
            : t("attendance.removeMemberConfirmText")
        }
        confirmLabel={confirming?.kind === "session" ? t("common.delete") : t("common.remove")}
        pendingLabel={confirming?.kind === "session" ? t("common.deleting") : t("common.removing")}
        pending={deleteSession.isPending || removeMember.isPending}
        error={confirmError ? errorMessage(toErrorCode(confirmError)) : undefined}
        onConfirm={() => {
          if (confirming?.kind === "session") {
            deleteSession.mutate(confirming.session.id, { onSuccess: closeConfirm });
          } else if (confirming?.kind === "member") {
            removeMember.mutate(confirming.member.id, { onSuccess: closeConfirm });
          }
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
};
