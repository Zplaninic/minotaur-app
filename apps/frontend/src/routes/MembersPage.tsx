import type { MemberResponse } from "@repo/shared";
import { useState } from "react";
import { useAbility } from "../api/auth";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { MemberForm } from "../features/members/MemberForm";
import { MembersTable } from "../features/members/MembersTable";
import { useMessages } from "../lib/messages";
import styles from "./MembersPage.module.css";

export const MembersPage = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MemberResponse | undefined>();
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const close = () => setAdding(false);
  const closeEdit = () => setEditing(undefined);

  if (!ability.can("read", "Member")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("members.title")}</h1>
        {ability.can("create", "Member") ? <Button onClick={() => setAdding(true)}>{t("members.add")}</Button> : null}
      </div>
      {ability.can("read", "Subscription") ? (
        <label className={styles.filter}>
          <input type="checkbox" checked={unpaidOnly} onChange={(event) => setUnpaidOnly(event.target.checked)} />
          {t("members.unpaidOnly")}
        </label>
      ) : null}
      {/* Keyed by the filter, so switching it starts again from the first page. */}
      <MembersTable key={String(unpaidOnly)} onEdit={setEditing} unpaidOnly={unpaidOnly} />
      <Dialog open={adding} onClose={close} title={t("memberForm.title")}>
        <MemberForm onCancel={close} onSaved={close} />
      </Dialog>
      <Dialog open={editing !== undefined} onClose={closeEdit} title={t("memberForm.editTitle")}>
        {/* Keyed by member, so the form starts fresh for each one. */}
        {editing ? <MemberForm key={editing.id} member={editing} onCancel={closeEdit} onSaved={closeEdit} /> : null}
      </Dialog>
    </div>
  );
};
