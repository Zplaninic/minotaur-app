import type { SubscriptionResponse } from "@repo/shared";
import { useState } from "react";
import { useAbility } from "../api/auth";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { SubscriptionForm } from "../features/subscriptions/SubscriptionForm";
import { SubscriptionsTable } from "../features/subscriptions/SubscriptionsTable";
import { t } from "../lib/messages";
import styles from "./SubscriptionsPage.module.css";

export const SubscriptionsPage = () => {
  const ability = useAbility();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SubscriptionResponse | undefined>();
  const close = () => setAdding(false);
  const closeEdit = () => setEditing(undefined);

  if (!ability.can("read", "Subscription")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("subscriptions.title")}</h1>
        {ability.can("create", "Subscription") ? (
          <Button onClick={() => setAdding(true)}>{t("subscriptions.add")}</Button>
        ) : null}
      </div>
      <SubscriptionsTable onEdit={setEditing} />
      <Dialog open={adding} onClose={close} title={t("subscriptionForm.title")}>
        {adding ? <SubscriptionForm onCancel={close} onSaved={close} /> : null}
      </Dialog>
      <Dialog open={editing !== undefined} onClose={closeEdit} title={t("subscriptionForm.editTitle")}>
        {/* Keyed by subscription, so the form starts fresh for each one. */}
        {editing ? (
          <SubscriptionForm key={editing.id} subscription={editing} onCancel={closeEdit} onSaved={closeEdit} />
        ) : null}
      </Dialog>
    </div>
  );
};
