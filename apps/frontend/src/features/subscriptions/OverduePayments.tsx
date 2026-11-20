import { toErrorCode } from "@repo/shared/client";
import { useOverduePayments } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { formatMoney, formatMonth, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./PaymentSummary.module.css";
import { TableSkeleton } from "../../components/TableSkeleton";

// Members who had a subscription in a past month and did not pay for it.
export const OverduePayments = () => {
  const { errorMessage, t } = useMessages();
  const overdue = useOverduePayments();

  const body = () => {
    if (overdue.isPending) {
      return <TableSkeleton label={t("overdue.loading")} columns={3} rows={4} />;
    }
    if (overdue.isError) {
      return (
        <div className={styles.state} role="alert">
          <p>{errorMessage(toErrorCode(overdue.error))}</p>
          <div>
            <Button variant="secondary" onClick={() => void overdue.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        </div>
      );
    }
    if (overdue.data.items.length === 0) {
      return <p className={styles.state}>{t("overdue.empty")}</p>;
    }
    return (
      <>
        <p className={styles.owed}>{t("overdue.total", { total: formatMoney(overdue.data.total) })}</p>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className={styles.caption}>{t("overdue.table.caption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("overdue.table.name")}</th>
                <th scope="col">{t("overdue.table.months")}</th>
                <th scope="col" className={styles.number}>
                  {t("overdue.table.total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {overdue.data.items.map((member) => (
                <tr key={member.id}>
                  <th scope="row">{formatPersonName(member)}</th>
                  <td>
                    <ul className={styles.months}>
                      {member.months.map((entry) => (
                        <li key={entry.month}>
                          {t("overdue.month", {
                            month: formatMonth(entry.month),
                            subscription: entry.subscription.name,
                            price: formatMoney(entry.price),
                          })}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={styles.number}>{formatMoney(member.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <section className={styles.section} aria-labelledby="overdue-title">
      <h2 id="overdue-title">{t("overdue.title")}</h2>
      {body()}
    </section>
  );
};
