import type { AttendanceMemberResponse, Month } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useSetMonthPaid } from "../../api/attendance";
import { formatMonth, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./AttendanceCheckbox.module.css";
import selectStyles from "./MonthSubscriptionSelect.module.css";

type MonthPaidCheckboxProps = {
  groupId: string;
  month: Month;
  member: AttendanceMemberResponse;
  disabled: boolean;
  // "cell" shows only the box; "row" shows "Paid" next to it.
  layout: "cell" | "row";
};

// Whether the member paid for the month, the same in all their groups.
// Saves as soon as it changes. Only a month with a subscription can be paid.
export const MonthPaidCheckbox = ({ groupId, month, member, disabled, layout }: MonthPaidCheckboxProps) => {
  const { errorMessage, t } = useMessages();
  const setPaid = useSetMonthPaid(groupId, month, member.id);
  // While saving, show the value being saved rather than jumping back.
  const checked = setPaid.isPending ? setPaid.variables : member.paid;

  return (
    <div>
      <label className={styles[layout]}>
        <input
          type="checkbox"
          className={styles.box}
          checked={checked}
          disabled={disabled || setPaid.isPending || (member.subscription === null && !member.paid)}
          aria-label={t("attendance.paidLabel", { name: formatPersonName(member), month: formatMonth(month) })}
          onChange={(event) => setPaid.mutate(event.target.checked)}
        />
        {layout === "row" ? t("attendance.paid") : null}
      </label>
      {setPaid.error ? (
        <p role="alert" className={selectStyles.error}>
          {errorMessage(toErrorCode(setPaid.error))}
        </p>
      ) : null}
    </div>
  );
};
