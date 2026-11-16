import type { SubscriptionResponse } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useAbility } from "../../api/auth";
import { useSubscriptions } from "../../api/subscriptions";
import { Button } from "../../components/Button";
import { formatMoney, formatNumber } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import styles from "./SubscriptionsTable.module.css";

type SubscriptionsTableProps = {
  onEdit: (subscription: SubscriptionResponse) => void;
};

export const SubscriptionsTable = ({ onEdit }: SubscriptionsTableProps) => {
  const subscriptions = useSubscriptions();
  const canEdit = useAbility().can("update", "Subscription");

  if (subscriptions.isPending) {
    return <output>{t("subscriptions.loading")}</output>;
  }
  if (subscriptions.isError) {
    return (
      <div className={styles.state} role="alert">
        <p>{errorMessage(toErrorCode(subscriptions.error))}</p>
        <div>
          <Button variant="secondary" onClick={() => void subscriptions.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }
  if (subscriptions.data.items.length === 0) {
    return <p className={styles.state}>{t("subscriptions.empty")}</p>;
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.caption}>{t("subscriptions.table.caption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("subscriptions.table.name")}</th>
            <th scope="col">{t("subscriptions.table.sessionsPerWeek")}</th>
            <th scope="col" className={styles.number}>
              {t("subscriptions.table.price")}
            </th>
            {canEdit ? <th scope="col">{t("subscriptions.table.actions")}</th> : null}
          </tr>
        </thead>
        <tbody>
          {subscriptions.data.items.map((subscription) => (
            <tr key={subscription.id}>
              <th scope="row">{subscription.name}</th>
              <td>{formatNumber(subscription.sessionsPerWeek)}</td>
              <td className={styles.number}>{formatMoney(subscription.price)}</td>
              {canEdit ? (
                <td className={styles.actions}>
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(subscription)}
                    aria-label={t("subscriptions.editLabel", { name: subscription.name })}
                  >
                    {t("subscriptions.edit")}
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
