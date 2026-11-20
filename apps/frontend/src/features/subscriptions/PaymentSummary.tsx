import { hasPreviousMonth, shiftMonth, toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { useSubscriptionSummary } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { formatMoney, formatMonth, formatNumber } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import { useToday } from "../../lib/useToday";
import navStyles from "../attendance/Attendance.module.css";
import styles from "./PaymentSummary.module.css";
import { TableSkeleton } from "../../components/TableSkeleton";

// One month's money: what was expected, what came in, and per subscription.
export const PaymentSummary = () => {
  const { errorMessage, t } = useMessages();
  const today = useToday();
  // An ISO date starts with its month.
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const summary = useSubscriptionSummary(month);
  // Next month can already have subscriptions; later ones cannot.
  const canGoForward = month < shiftMonth(currentMonth, 1);

  const body = () => {
    if (summary.isPending) {
      return <TableSkeleton label={t("payments.loading")} columns={4} rows={3} />;
    }
    if (summary.isError) {
      return (
        <div className={styles.state} role="alert">
          <p>{errorMessage(toErrorCode(summary.error))}</p>
          <div>
            <Button variant="secondary" onClick={() => void summary.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        </div>
      );
    }
    const data = summary.data;
    if (data.members === 0) {
      return <p className={styles.state}>{t("payments.empty", { month: formatMonth(month) })}</p>;
    }
    const figures = [
      [t("payments.members"), formatNumber(data.members)],
      [t("payments.paid"), formatNumber(data.paid)],
      [t("payments.unpaid"), formatNumber(data.unpaid)],
      [t("payments.expected"), formatMoney(data.expected)],
      [t("payments.collected"), formatMoney(data.collected)],
      [t("payments.open"), formatMoney(data.open)],
    ] as const;
    return (
      <>
        <dl className={styles.figures}>
          {figures.map(([label, value]) => (
            <div key={label} className={styles.figure}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className={styles.caption}>{t("payments.table.caption", { month: formatMonth(month) })}</caption>
            <thead>
              <tr>
                <th scope="col">{t("payments.table.subscription")}</th>
                <th scope="col" className={styles.number}>
                  {t("payments.table.members")}
                </th>
                <th scope="col" className={styles.number}>
                  {t("payments.table.paid")}
                </th>
                <th scope="col" className={styles.number}>
                  {t("payments.table.collected")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.bySubscription.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.name}</th>
                  <td className={styles.number}>{formatNumber(row.members)}</td>
                  <td className={styles.number}>{formatNumber(row.paid)}</td>
                  <td className={styles.number}>
                    {t("payments.collectedOf", {
                      collected: formatMoney(row.collected),
                      expected: formatMoney(row.expected),
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <section className={styles.section} aria-labelledby="payments-title">
      <h2 id="payments-title">{t("payments.title")}</h2>
      <nav className={navStyles.nav} aria-label={t("payments.monthNav")}>
        <button
          type="button"
          className={navStyles.arrow}
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={!hasPreviousMonth(month)}
          aria-label={t("payments.previousMonth")}
        >
          ‹
        </button>
        <p className={navStyles.navLabel} aria-live="polite">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          className={navStyles.arrow}
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={!canGoForward}
          aria-label={t("payments.nextMonth")}
        >
          ›
        </button>
      </nav>
      {body()}
    </section>
  );
};
