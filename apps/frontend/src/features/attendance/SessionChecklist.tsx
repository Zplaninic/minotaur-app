import type { AttendanceMemberResponse, Month, TrainingSessionResponse } from "@repo/shared";
import { isFutureDate } from "@repo/shared/client";
import { useAbility } from "../../api/auth";
import { NewBadge } from "../../components/NewBadge";
import { formatNumber, formatPersonName, formatSessionDate } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { AttendanceCheckbox } from "./AttendanceCheckbox";
import { MonthCommentInput } from "./MonthCommentInput";
import { MonthPaidCheckbox } from "./MonthPaidCheckbox";
import { MonthSubscriptionSelect } from "./MonthSubscriptionSelect";
import { NewMemberToggle } from "./NewMemberToggle";
import { UnpaidBadge } from "./UnpaidBadge";
import styles from "./SessionChecklist.module.css";

type SessionChecklistProps = {
  groupId: string;
  month: Month;
  session: TrainingSessionResponse;
  members: readonly AttendanceMemberResponse[];
  today: string;
};

// One session, one tappable row per member: the phone layout.
export const SessionChecklist = ({ groupId, month, session, members, today }: SessionChecklistProps) => {
  const { t } = useMessages();
  const ability = useAbility();
  const canTick = ability.can("update", "Attendance");
  const canMarkNew = ability.can("update", "Member");
  const disabled = !canTick || isFutureDate(session.date, today);
  const attended = members.filter((member) => member.attendedSessionIds.includes(session.id)).length;

  return (
    <div className={styles.wrapper}>
      <p className={styles.count}>
        {t("attendance.count", { count: formatNumber(attended), total: formatNumber(members.length) })}
      </p>
      <ul className={styles.list}>
        {members.map((member) => (
          <li key={member.id}>
            <AttendanceCheckbox
              layout="row"
              groupId={groupId}
              month={month}
              sessionId={session.id}
              memberId={member.id}
              checked={member.attendedSessionIds.includes(session.id)}
              disabled={disabled}
              label={t("attendance.checkboxLabel", {
                name: formatPersonName(member),
                date: formatSessionDate(session.date),
              })}
            >
              {formatPersonName(member)}
            </AttendanceCheckbox>
            <div className={styles.subscription}>
              <MonthSubscriptionSelect groupId={groupId} month={month} member={member} disabled={!canTick} />
              <MonthPaidCheckbox groupId={groupId} month={month} member={member} disabled={!canTick} layout="row" />
              {member.isNew ? <NewBadge /> : null}
              <UnpaidBadge memberId={member.id} />
              {canMarkNew ? <NewMemberToggle member={member} /> : null}
              <MonthCommentInput groupId={groupId} month={month} member={member} disabled={!canTick} layout="row" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
