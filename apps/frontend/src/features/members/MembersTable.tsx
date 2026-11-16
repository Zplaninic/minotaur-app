import { DEFAULT_PAGE_SIZE, type MemberResponse } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { useAbility } from "../../api/auth";
import { useMembers } from "../../api/members";
import { Button } from "../../components/Button";
import { formatCalendarDate, formatPersonName, formatSortedName } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import styles from "./MembersTable.module.css";

const orEmpty = (value: string | null) => value ?? t("common.empty");

type MembersTableProps = {
  onEdit: (member: MemberResponse) => void;
};

export const MembersTable = ({ onEdit }: MembersTableProps) => {
  const ability = useAbility();
  const canEdit = ability.can("update", "Member");
  const [page, setPage] = useState(1);
  const members = useMembers({ page, pageSize: DEFAULT_PAGE_SIZE });

  if (members.isPending) {
    return <output>{t("members.loading")}</output>;
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
    return <p className={styles.state}>{t("members.empty")}</p>;
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>{t("members.table.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("members.table.name")}</th>
              <th scope="col">{t("members.table.birthday")}</th>
              <th scope="col">{t("members.table.email")}</th>
              <th scope="col">{t("members.table.phone")}</th>
              <th scope="col">{t("members.table.guardians")}</th>
              {canEdit ? <th scope="col">{t("members.table.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((member) => (
              <tr key={member.id}>
                <th scope="row">
                  {formatSortedName(member)}
                  {member.role === "trainer" ? <span className={styles.label}>{t("members.trainerLabel")}</span> : null}
                </th>
                <td className={styles.nowrap}>{formatCalendarDate(member.birthday)}</td>
                <td>{orEmpty(member.email)}</td>
                <td className={styles.nowrap}>{orEmpty(member.phone)}</td>
                <td>
                  {member.guardians.length === 0
                    ? t("common.empty")
                    : member.guardians.map(formatPersonName).join(", ")}
                </td>
                {canEdit ? (
                  <td className={styles.actions}>
                    <Button
                      variant="secondary"
                      onClick={() => onEdit(member)}
                      aria-label={t("members.editLabel", { name: formatPersonName(member) })}
                    >
                      {t("members.edit")}
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <nav className={styles.pagination} aria-label={t("members.pagination.label")}>
          <Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page <= 1}>
            {t("members.pagination.previous")}
          </Button>
          <p aria-live="polite">{t("members.pagination.status", { page, pages })}</p>
          <Button variant="secondary" onClick={() => setPage(page + 1)} disabled={page >= pages}>
            {t("members.pagination.next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
};
