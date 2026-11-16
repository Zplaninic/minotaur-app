import { useState } from "react";
import { useAbility } from "../api/auth";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { GroupForm } from "../features/groups/GroupForm";
import { GroupsTable } from "../features/groups/GroupsTable";
import { useMessages } from "../lib/messages";
import styles from "./GroupsPage.module.css";

export const GroupsPage = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const [adding, setAdding] = useState(false);
  const close = () => setAdding(false);

  if (!ability.can("read", "Group")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("groups.title")}</h1>
        {ability.can("create", "Group") ? <Button onClick={() => setAdding(true)}>{t("groups.add")}</Button> : null}
      </div>
      <GroupsTable />
      <Dialog open={adding} onClose={close} title={t("groupForm.title")}>
        <GroupForm onCancel={close} onSaved={close} />
      </Dialog>
    </div>
  );
};
