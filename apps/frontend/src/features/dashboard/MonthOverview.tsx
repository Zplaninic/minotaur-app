import { attendanceRate } from "@repo/shared/client";
import type { ReactNode } from "react";
import { useAbility } from "../../api/auth";
import { useDashboard } from "../../api/dashboard";
import { useSubscriptionSummary } from "../../api/subscriptions";
import { formatMoney, formatNumber, formatPercent } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./Dashboard.module.css";
import { SectionError } from "./SectionError";

// The current month in a few numbers.
export const MonthOverview = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const canReadMoney = ability.can("read", "Subscription");
  const dashboard = useDashboard();
  const month = dashboard.data?.month;
  const summary = useSubscriptionSummary(month ?? "", { enabled: canReadMoney && month !== undefined });

  const body = () => {
    // The summary waits for the month from the dashboard, so the dashboard is checked first.
    if (dashboard.isPending) {
      return <output>{t("dashboard.overview.loading")}</output>;
    }
    if (dashboard.isError) {
      return <SectionError error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
    }
    if (canReadMoney && summary.isPending) {
      return <output>{t("dashboard.overview.loading")}</output>;
    }
    if (canReadMoney && summary.isError) {
      return <SectionError error={summary.error} onRetry={() => void summary.refetch()} />;
    }
    const rate = attendanceRate(dashboard.data.attendance);
    const figures: [string, ReactNode][] = [
      [t("dashboard.overview.activeMembers"), formatNumber(dashboard.data.activeMembers)],
      [t("dashboard.overview.attendance"), rate === undefined ? t("common.empty") : formatPercent(rate)],
    ];
    if (canReadMoney && summary.data) {
      figures.push([
        t("dashboard.overview.collected"),
        <>
          {formatMoney(summary.data.collected)}
          <span className={styles.of}>
            {t("dashboard.overview.collectedOf", { expected: formatMoney(summary.data.expected) })}
          </span>
        </>,
      ]);
    }
    return (
      <dl className={styles.figures}>
        {figures.map(([label, value]) => (
          <div key={label} className={styles.figure}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    );
  };

  return (
    <section className={styles.section} aria-labelledby="overview-title">
      <h2 id="overview-title">{t("dashboard.overview.title")}</h2>
      {body()}
    </section>
  );
};
