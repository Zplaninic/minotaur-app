import { toErrorCode } from "@repo/shared/client";
import { useAbility } from "../../api/auth";
import { useGroupMembers, useRemoveGroupMember } from "../../api/groups";
import { Button } from "../../components/Button";
import { formatCalendarDate, formatPersonName, formatSortedName } from "../../lib/format";
import { errorMessage, t } from "../../lib/messages";
import styles from "./GroupMembersTable.module.css";

type GroupMembersTableProps = {
  groupId: string;
};

export const GroupMembersTable = ({ groupId }: GroupMembersTableProps) => {
  const ability = useAbility();
  const members = useGroupMembers(groupId);
  const removeMember = useRemoveGroupMember(groupId);
  const canChange = ability.can("update", "Group");

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
      {removeMember.error ? (
        <p role="alert" className={styles.error}>
          {errorMessage(toErrorCode(removeMember.error))}
        </p>
      ) : null}
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
                <th scope="row">{formatSortedName(member)}</th>
                <td className={styles.nowrap}>{formatCalendarDate(member.birthday)}</td>
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
                      onClick={() => removeMember.mutate(member.id)}
                      disabled={removeMember.isPending}
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
    </div>
  );
};
