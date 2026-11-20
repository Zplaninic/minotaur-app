import { MAX_MEMBER_SEARCH_LENGTH, type MemberResponse } from "@repo/shared";
import { useState } from "react";
import { useAbility } from "../api/auth";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { TextField } from "../components/TextField";
import { ImportMembers } from "../features/members/ImportMembers";
import { MemberForm } from "../features/members/MemberForm";
import { MembersTable } from "../features/members/MembersTable";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { useMessages } from "../lib/messages";
import styles from "./MembersPage.module.css";

export const MembersPage = () => {
  const { t } = useMessages();
  const ability = useAbility();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<MemberResponse | undefined>();
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const close = () => setAdding(false);
  const closeEdit = () => setEditing(undefined);

  if (!ability.can("read", "Member")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>{t("members.title")}</h1>
        <div className={styles.headerActions}>
          {/* An import also sets this month's subscriptions, which only admins manage. */}
          {ability.can("create", "Member") && ability.can("manage", "Subscription") ? (
            <Button variant="secondary" onClick={() => setImporting(true)}>
              {t("membersImport.open")}
            </Button>
          ) : null}
          {ability.can("create", "Member") ? <Button onClick={() => setAdding(true)}>{t("members.add")}</Button> : null}
        </div>
      </div>
      <div className={styles.filters}>
        <div className={styles.search}>
          <TextField
            type="search"
            label={t("members.search")}
            value={search}
            onChange={setSearch}
            maxLength={MAX_MEMBER_SEARCH_LENGTH}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {ability.can("read", "Subscription") ? (
          <label className={styles.filter}>
            <input type="checkbox" checked={unpaidOnly} onChange={(event) => setUnpaidOnly(event.target.checked)} />
            {t("members.unpaidOnly")}
          </label>
        ) : null}
      </div>
      <MembersTable onEdit={setEditing} unpaidOnly={unpaidOnly} search={debouncedSearch} />
      <Dialog open={adding} onClose={close} title={t("memberForm.title")}>
        <MemberForm onCancel={close} onSaved={close} />
      </Dialog>
      <Dialog open={importing} onClose={() => setImporting(false)} title={t("membersImport.title")}>
        <ImportMembers onClose={() => setImporting(false)} />
      </Dialog>
      <Dialog open={editing !== undefined} onClose={closeEdit} title={t("memberForm.editTitle")}>
        {/* Keyed by member, so the form starts fresh for each one. */}
        {editing ? <MemberForm key={editing.id} member={editing} onCancel={closeEdit} onSaved={closeEdit} /> : null}
      </Dialog>
    </div>
  );
};
