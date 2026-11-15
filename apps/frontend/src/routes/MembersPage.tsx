import { useState } from "react";
import { useAbility } from "../api/auth";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { MemberForm } from "../features/members/MemberForm";
import { MembersTable } from "../features/members/MembersTable";
import { t } from "../lib/messages";
import styles from "./MembersPage.module.css";

export const MembersPage = () => {
  const ability = useAbility();
  const [adding, setAdding] = useState(false);
  const close = () => setAdding(false);

  if (!ability.can("read", "Member")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("members.title")}</h1>
        {ability.can("create", "Member") ? <Button onClick={() => setAdding(true)}>{t("members.add")}</Button> : null}
      </div>
      <MembersTable />
      <Dialog open={adding} onClose={close} title={t("memberForm.title")}>
        <MemberForm onCancel={close} onSaved={close} />
      </Dialog>
    </div>
  );
};
