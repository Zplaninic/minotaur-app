import { DEFAULT_PAGE_SIZE, type MemberResponse } from "@repo/shared";
import { toErrorCode, type ClientErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { useAbility, useMe } from "../../api/auth";
import { useArchiveMember, useMembers } from "../../api/members";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatCalendarDate, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./MembersTable.module.css";
import { TableSkeleton } from "../../components/TableSkeleton";

type MembersTableProps = {
  onEdit: (member: MemberResponse) => void;
  // Only members with a past month that has a subscription and is not paid.
  unpaidOnly: boolean;
  // Words to find in the name, surname or email; blank shows everyone.
  search: string;
};

export const MembersTable = ({ onEdit, unpaidOnly, search }: MembersTableProps) => {
  const { errorMessage, t } = useMessages();
  const orEmpty = (value: string | null) => value ?? t("common.empty");
  // The only CONFLICT here is a trainer who still leads groups.
  const archiveErrorMessage = (code: ClientErrorCode): string =>
    code === "CONFLICT" ? t("members.deleteOwnerConflict") : errorMessage(code);
  const ability = useAbility();
  const me = useMe();
  const canEdit = ability.can("update", "Member");
  const canDelete = ability.can("delete", "Member");
  // A new filter starts again from the first page. The table stays mounted, so
  // the previous rows remain visible while the filtered ones load.
  const filters = `${String(unpaidOnly)}|${search}`;
  const [paging, setPaging] = useState({ filters, page: 1 });
  const page = paging.filters === filters ? paging.page : 1;
  const setPage = (next: number) => setPaging({ filters, page: next });
  const members = useMembers({ page, pageSize: DEFAULT_PAGE_SIZE, unpaid: unpaidOnly, search });
  const archiveMember = useArchiveMember();
  const [deleting, setDeleting] = useState<MemberResponse | undefined>();
  const closeConfirm = () => {
    setDeleting(undefined);
    archiveMember.reset();
  };

  if (members.isPending) {
    return <TableSkeleton label={t("members.loading")} columns={canEdit || canDelete ? 6 : 5} />;
  }
  if (members.isError) {
    return (
      <div className={styles.state} role="alert">
        <p>{errorMessage(toErrorCode(members.error))}</p>
        <div>
          <Button variant="secondary" onClick={() => void members.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const { items, total, pageSize } = members.data;
  if (total === 0) {
    const empty = search ? t("members.searchEmpty") : unpaidOnly ? t("members.unpaidEmpty") : t("members.empty");
    return <p className={styles.state}>{empty}</p>;
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // The last page can empty out, e.g. after its only member is deleted.
  if (page > pages) {
    setPage(pages);
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={[styles.scroll, members.isPlaceholderData ? styles.stale : ""].filter(Boolean).join(" ")}
        aria-busy={members.isPlaceholderData || undefined}
      >
        <table className={styles.table}>
          <caption className={styles.caption}>{t("members.table.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("members.table.name")}</th>
              <th scope="col">{t("members.table.birthday")}</th>
              <th scope="col">{t("members.table.email")}</th>
              <th scope="col">{t("members.table.phone")}</th>
              <th scope="col">{t("members.table.guardians")}</th>
              {canEdit || canDelete ? <th scope="col">{t("members.table.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((member) => (
              <tr key={member.id}>
                <th scope="row">
                  {formatPersonName(member)}
                  {member.role === "trainer" ? <span className={styles.label}>{t("members.trainerLabel")}</span> : null}
                </th>
                <td className={styles.nowrap}>{member.birthday ? formatCalendarDate(member.birthday) : t("common.empty")}</td>
                <td>{orEmpty(member.email)}</td>
                <td className={styles.nowrap}>{orEmpty(member.phone)}</td>
                <td>
                  {member.guardians.length === 0
                    ? t("common.empty")
                    : member.guardians.map(formatPersonName).join(", ")}
                </td>
                {canEdit || canDelete ? (
                  <td className={styles.actions}>
                    {canEdit ? (
                      <Button
                        variant="secondary"
                        onClick={() => onEdit(member)}
                        aria-label={t("members.editLabel", { name: formatPersonName(member) })}
                      >
                        {t("members.edit")}
                      </Button>
                    ) : null}
                    {/* Nobody deletes themselves; the backend refuses it too. */}
                    {canDelete && member.id !== me.data?.memberId ? (
                      <Button
                        variant="secondary"
                        onClick={() => setDeleting(member)}
                        aria-label={t("members.deleteLabel", { name: formatPersonName(member) })}
                      >
                        {t("common.delete")}
                      </Button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleting !== undefined}
        title={deleting ? t("members.deleteConfirmTitle", { name: formatPersonName(deleting) }) : ""}
        message={t("members.deleteConfirmText")}
        confirmLabel={t("common.delete")}
        pendingLabel={t("common.deleting")}
        pending={archiveMember.isPending}
        error={archiveMember.error ? archiveErrorMessage(toErrorCode(archiveMember.error)) : undefined}
        onConfirm={() => deleting && archiveMember.mutate(deleting.id, { onSuccess: closeConfirm })}
        onCancel={closeConfirm}
      />

      {pages > 1 ? (
        <nav className={styles.pagination} aria-label={t("members.pagination.label")}>
          <Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page <= 1 || members.isPlaceholderData}>
            {t("members.pagination.previous")}
          </Button>
          <p aria-live="polite">{t("members.pagination.status", { page, pages })}</p>
          <Button variant="secondary" onClick={() => setPage(page + 1)} disabled={page >= pages || members.isPlaceholderData}>
            {t("members.pagination.next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
};
