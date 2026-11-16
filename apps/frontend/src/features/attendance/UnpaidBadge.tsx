import { overdueMonthsOf } from "@repo/shared/client";
import { useAbility } from "../../api/auth";
import { useOverduePayments } from "../../api/subscriptions";
import { formatShortMonth } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./UnpaidBadge.module.css";

type UnpaidBadgeProps = {
  memberId: string;
};

// Past months the member had a subscription for and did not pay, in any group.
export const UnpaidBadge = ({ memberId }: UnpaidBadgeProps) => {
  const { t } = useMessages();
  const canRead = useAbility().can("read", "Subscription");
  const overdue = useOverduePayments();
  const months = canRead ? overdueMonthsOf(overdue.data, memberId) : [];
  if (months.length === 0) {
    return null;
  }
  return <span className={styles.badge}>{t("overdue.badge", { months: months.map(formatShortMonth).join(", ") })}</span>;
};
