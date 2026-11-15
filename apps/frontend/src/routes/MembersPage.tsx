import { useState } from "react";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { MemberForm } from "../features/members/MemberForm";
import { MembersTable } from "../features/members/MembersTable";
import { t } from "../lib/messages";
import styles from "./MembersPage.module.css";

export const MembersPage = () => {
  const [adding, setAdding] = useState(false);
  const close = () => setAdding(false);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("members.title")}</h1>
        <Button onClick={() => setAdding(true)}>{t("members.add")}</Button>
      </div>
      <MembersTable />
      <Dialog open={adding} onClose={close} title={t("memberForm.title")}>
        <MemberForm onCancel={close} onSaved={close} />
      </Dialog>
    </div>
  );
};
