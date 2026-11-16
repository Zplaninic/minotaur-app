import type { DashboardResponse, OverduePaymentsResponse, SubscriptionSummaryResponse } from "@repo/shared";
import { Link } from "@tanstack/react-router";
import { useAbility } from "../../api/auth";
import { useDashboard } from "../../api/dashboard";
import { useOverduePayments, useSubscriptionSummary } from "../../api/subscriptions";
import { formatMoney, formatMonth, formatNumber, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./Dashboard.module.css";
import { SectionError } from "./SectionError";

type Money = { summary: SubscriptionSummaryResponse; overdue: OverduePaymentsResponse } | undefined;

const Items = ({ dashboard, money }: { dashboard: DashboardResponse; money: Money }) => {
  const { t } = useMessages();
  const unpaid = money?.summary.unpaid ?? 0;
  const overdue = money?.overdue.items.length ?? 0;
  const { withoutSubscription, month } = dashboard;

  if (unpaid === 0 && overdue === 0 && withoutSubscription.length === 0) {
    return <p>{t("dashboard.attention.allGood")}</p>;
  }
  return (
    <ul className={styles.list}>
      {money && unpaid > 0 ? (
        <li className={`${styles.item} ${styles.warning}`}>
          <Link to="/subscriptions">
            {t("dashboard.attention.unpaid", { month: formatMonth(month), count: formatNumber(unpaid) })}
          </Link>
        </li>
      ) : null}
      {money && overdue > 0 ? (
        <li className={`${styles.item} ${styles.warning}`}>
          <Link to="/subscriptions">
            {t("dashboard.attention.overdue", {
              count: formatNumber(overdue),
              total: formatMoney(money.overdue.total),
            })}
          </Link>
        </li>
      ) : null}
      {withoutSubscription.length > 0 ? (
        <li className={styles.item}>
          <span id="no-subscription-title">
            {t("dashboard.attention.noSubscription", {
              month: formatMonth(month),
              count: formatNumber(withoutSubscription.length),
            })}
          </span>
          <ul className={styles.names} aria-labelledby="no-subscription-title">
            {withoutSubscription.map((member) => (
              <li key={member.id}>
                {/* The subscription is set on a group's attendance sheet; the first group is enough. */}
                <Link
                  to="/groups/$groupId/attendance"
                  params={{ groupId: member.groupIds[0] ?? "" }}
                  search={{ month }}
                >
                  {formatPersonName(member)}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </ul>
  );
};

// Payments still missing and members whose month has no subscription.
export const NeedsAttention = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const canReadMoney = ability.can("read", "Subscription");
  const dashboard = useDashboard();
  const month = dashboard.data?.month;
  const summary = useSubscriptionSummary(month ?? "", { enabled: canReadMoney && month !== undefined });
  const overdue = useOverduePayments({ enabled: canReadMoney });
  const moneyQueries = canReadMoney ? [summary, overdue] : [];

  const body = () => {
    // The summary waits for the month from the dashboard, so the dashboard is checked first.
    if (dashboard.isPending) {
      return <output>{t("dashboard.attention.loading")}</output>;
    }
    if (dashboard.isError) {
      return <SectionError error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
    }
    if (moneyQueries.some((query) => query.isPending)) {
      return <output>{t("dashboard.attention.loading")}</output>;
    }
    const failed = moneyQueries.filter((query) => query.isError);
    if (failed.length > 0) {
      return (
        <SectionError error={failed[0]?.error} onRetry={() => failed.forEach((query) => void query.refetch())} />
      );
    }
    const money = summary.data && overdue.data ? { summary: summary.data, overdue: overdue.data } : undefined;
    return <Items dashboard={dashboard.data} money={canReadMoney ? money : undefined} />;
  };

  return (
    <section className={styles.section} aria-labelledby="attention-title">
      <h2 id="attention-title">{t("dashboard.attention.title")}</h2>
      {body()}
    </section>
  );
};
