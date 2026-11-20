import type { GroupMemberResponse } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { useAbility } from "../../api/auth";
import { useGroupMembers, useRemoveGroupMember } from "../../api/groups";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatCalendarDate, formatPersonName } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./GroupMembersTable.module.css";

type GroupMembersTableProps = {
  groupId: string;
};

export const GroupMembersTable = ({ groupId }: GroupMembersTableProps) => {
  const { errorMessage, t } = useMessages();
  const ability = useAbility();
  const members = useGroupMembers(groupId);
  const removeMember = useRemoveGroupMember(groupId);
  const canChange = ability.can("update", "Group");
  const [removing, setRemoving] = useState<GroupMemberResponse | undefined>();
  const closeConfirm = () => {
    setRemoving(undefined);
    removeMember.reset();
  };

  if (members.isPending) {
    return <output>{t("groupMembers.loading")}</output>;
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
  if (members.data.items.length === 0) {
    return <p className={styles.state}>{t("groupMembers.empty")}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>{t("groupMembers.table.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("groupMembers.table.name")}</th>
              <th scope="col">{t("groupMembers.table.birthday")}</th>
              <th scope="col">{t("groupMembers.table.email")}</th>
              <th scope="col">{t("groupMembers.table.phone")}</th>
              <th scope="col">{t("groupMembers.table.guardians")}</th>
              {canChange ? <th scope="col">{t("groupMembers.table.actions")}</th> : null}
            </tr>
          </thead>
          <tbody>
            {members.data.items.map((member) => (
              <tr key={member.id}>
                <th scope="row">{formatPersonName(member)}</th>
                <td className={styles.nowrap}>{member.birthday ? formatCalendarDate(member.birthday) : t("common.empty")}</td>
                <td>{member.email ?? t("common.empty")}</td>
                <td className={styles.nowrap}>{member.phone ?? t("common.empty")}</td>
                <td>
                  {member.guardians.length === 0
                    ? t("common.empty")
                    : member.guardians.map(formatPersonName).join(", ")}
                </td>
                {canChange ? (
                  <td className={styles.actions}>
                    <Button
                      variant="secondary"
                      onClick={() => setRemoving(member)}
                      aria-label={t("groupMembers.removeLabel", { name: formatPersonName(member) })}
                    >
                      {t("groupMembers.remove")}
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={removing !== undefined}
        title={removing ? t("groupMembers.confirmTitle", { name: formatPersonName(removing) }) : ""}
        message={t("groupMembers.confirmText")}
        confirmLabel={t("common.remove")}
        pendingLabel={t("common.removing")}
        pending={removeMember.isPending}
        error={removeMember.error ? errorMessage(toErrorCode(removeMember.error)) : undefined}
        onConfirm={() => removing && removeMember.mutate(removing.id, { onSuccess: closeConfirm })}
        onCancel={closeConfirm}
      />
    </div>
  );
};
