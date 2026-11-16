import type { GroupAttendanceResponse, Month } from "@repo/shared";
import { isFutureDate, memberHasAttendance, sessionHasAttendance, toErrorCode } from "@repo/shared/client";
import { useAbility } from "../../api/auth";
import { useDeleteTrainingSession, useRemoveMonthMember } from "../../api/attendance";
import { formatMonth, formatPersonName, formatSessionDate, formatSortedName } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import { AttendanceCheckbox } from "./AttendanceCheckbox";
import styles from "./AttendanceGrid.module.css";

type AttendanceGridProps = {
  groupId: string;
  month: Month;
  data: GroupAttendanceResponse;
  today: string;
};

// Members × sessions of one month, like a sheet. Wide months scroll inside the box.
export const AttendanceGrid = ({ groupId, month, data, today }: AttendanceGridProps) => {
  const ability = useAbility();
  const deleteSession = useDeleteTrainingSession(groupId);
  const removeMember = useRemoveMonthMember(groupId, month);
  const canTick = ability.can("update", "Attendance");
  const canDelete = ability.can("delete", "Attendance");

  return (
    <div className={styles.wrapper}>
      {deleteSession.error ?? removeMember.error ? (
        <p role="alert" className={styles.error}>
          {errorMessage(toErrorCode(deleteSession.error ?? removeMember.error))}
        </p>
      ) : null}
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>{t("attendance.table.caption", { month: formatMonth(month) })}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.name}>
                {t("attendance.table.name")}
              </th>
              {data.sessions.map((session) => (
                <th key={session.id} scope="col" className={styles.session}>
                  <span>{formatSessionDate(session.date)}</span>
                  {canDelete && !sessionHasAttendance(data, session.id) ? (
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => deleteSession.mutate(session.id)}
                      disabled={deleteSession.isPending}
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
                    {formatSortedName(member)}
                    {canTick && !memberHasAttendance(member) ? (
                      <button
                        type="button"
                        className={styles.delete}
                        onClick={() => removeMember.mutate(member.id)}
                        disabled={removeMember.isPending}
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
    </div>
  );
};
