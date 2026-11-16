import type { AttendanceMemberResponse, Month } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useId } from "react";
import { useSetMonthSubscription } from "../../api/attendance";
import { useSubscriptions } from "../../api/subscriptions";
import { formatMonth, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./MonthSubscriptionSelect.module.css";

type MonthSubscriptionSelectProps = {
  groupId: string;
  month: Month;
  member: AttendanceMemberResponse;
  disabled: boolean;
};

// The member's subscription for the month, the same in all their groups.
// Saves as soon as it changes. A paid month cannot go without one.
export const MonthSubscriptionSelect = ({ groupId, month, member, disabled }: MonthSubscriptionSelectProps) => {
  const { errorMessage, t } = useMessages();
  const errorId = useId();
  const subscriptions = useSubscriptions();
  const setSubscription = useSetMonthSubscription(groupId, month, member.id);
  // Until the list loads, the current subscription is the only choice.
  const options = subscriptions.data?.items ?? (member.subscription ? [member.subscription] : []);
  // While saving, show the choice being saved rather than jumping back.
  const value = setSubscription.isPending
    ? (setSubscription.variables ?? "")
    : (member.subscription?.id ?? "");
  const errorCode = setSubscription.error ? toErrorCode(setSubscription.error) : undefined;
  // A paid month keeps its subscription; the server refuses with CONFLICT.
  const error =
    errorCode === "CONFLICT" ? t("attendance.paidKeepsSubscription") : errorCode ? errorMessage(errorCode) : undefined;

  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => setSubscription.mutate(event.target.value || null)}
        disabled={disabled || setSubscription.isPending}
        aria-label={t("attendance.subscriptionLabel", { name: formatPersonName(member), month: formatMonth(month) })}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        <option value="" disabled={member.paid}>
          {t("attendance.noSubscription")}
        </option>
        {options.map((subscription) => (
          <option key={subscription.id} value={subscription.id}>
            {subscription.name}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
};
