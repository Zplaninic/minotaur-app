import { toErrorCode } from "@repo/shared/client";
import { Link } from "@tanstack/react-router";
import { useGroups } from "../../api/groups";
import { Button } from "../../components/Button";
import { formatNumber, formatPersonName, formatTimeOfDay } from "../../lib/format";
import { useMessages, weekdayKey } from "../../lib/messages";
import { groupName } from "./groupName";
import styles from "./GroupsTable.module.css";

export const GroupsTable = () => {
  const { errorMessage, t } = useMessages();
  const groups = useGroups();

  if (groups.isPending) {
    return <output>{t("groups.loading")}</output>;
  }
  if (groups.isError) {
    return (
      <div className={styles.state} role="alert">
        <p>{errorMessage(toErrorCode(groups.error))}</p>
        <div>
          <Button variant="secondary" onClick={() => void groups.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }
  if (groups.data.items.length === 0) {
    return <p className={styles.state}>{t("groups.empty")}</p>;
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.caption}>{t("groups.table.caption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("groups.table.name")}</th>
            <th scope="col">{t("groups.table.owner")}</th>
            <th scope="col">{t("groups.table.days")}</th>
            <th scope="col">{t("groups.table.time")}</th>
            <th scope="col">{t("groups.table.members")}</th>
          </tr>
        </thead>
        <tbody>
          {groups.data.items.map((group) => (
            <tr key={group.id}>
              <th scope="row">
                <Link to="/groups/$groupId" params={{ groupId: group.id }}>
                  {groupName(group, t)}
                </Link>
              </th>
              <td className={styles.nowrap}>{formatPersonName(group.owner)}</td>
              <td>{group.days.map((day) => t(weekdayKey(day))).join(", ")}</td>
              <td className={styles.nowrap}>
                {t("groups.timeRange", { from: formatTimeOfDay(group.from), to: formatTimeOfDay(group.to) })}
              </td>
              <td>{formatNumber(group.memberCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
