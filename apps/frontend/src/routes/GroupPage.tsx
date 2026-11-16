import { toErrorCode } from "@repo/shared/client";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useAbility } from "../api/auth";
import { useGroup } from "../api/groups";
import { Button } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { AddGroupMemberForm } from "../features/groups/AddGroupMemberForm";
import { GroupMembersTable } from "../features/groups/GroupMembersTable";
import { groupName } from "../features/groups/groupName";
import { formatSortedName, formatTimeOfDay } from "../lib/format";
import { errorMessage, t, weekdayKey } from "../lib/messages";
import styles from "./GroupPage.module.css";

export const GroupPage = () => {
  const { groupId } = useParams({ from: "/app/groups/$groupId" });
  const ability = useAbility();
  const group = useGroup(groupId);
  const [adding, setAdding] = useState(false);
  const close = () => setAdding(false);

  if (!ability.can("read", "Group")) {
    return <p role="alert">{t("auth.noAccess")}</p>;
  }

  return (
    <div className={styles.page} data-layout="wide">
      <Link to="/groups" className={styles.back}>
        {t("group.back")}
      </Link>

      {group.isPending ? <output>{t("group.loading")}</output> : null}
      {group.isError ? (
        <div className={styles.state} role="alert">
          <p>{errorMessage(toErrorCode(group.error))}</p>
          <div>
            <Button variant="secondary" onClick={() => void group.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        </div>
      ) : null}
      {group.isSuccess ? (
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>{groupName(group.data)}</h1>
            {ability.can("read", "Attendance") ? (
              <Link to="/groups/$groupId/attendance" params={{ groupId }} search={{}} className={styles.attendance}>
                {t("group.attendance")}
              </Link>
            ) : null}
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>{t("group.owner")}</dt>
              <dd>{formatSortedName(group.data.owner)}</dd>
            </div>
            <div>
              <dt>{t("group.days")}</dt>
              <dd>{group.data.days.map((day) => t(weekdayKey(day))).join(", ")}</dd>
            </div>
            <div>
              <dt>{t("group.time")}</dt>
              <dd>
                {t("groups.timeRange", {
                  from: formatTimeOfDay(group.data.from),
                  to: formatTimeOfDay(group.data.to),
                })}
              </dd>
            </div>
          </dl>

          <section className={styles.members} aria-labelledby="group-members-title">
            <div className={styles.header}>
              <h2 id="group-members-title">{t("groupMembers.title")}</h2>
              {ability.can("update", "Group") ? (
                <Button onClick={() => setAdding(true)}>{t("groupMembers.add")}</Button>
              ) : null}
            </div>
            <GroupMembersTable groupId={groupId} />
          </section>

          <Dialog open={adding} onClose={close} title={t("groupMemberForm.title")}>
            <AddGroupMemberForm groupId={groupId} onCancel={close} onSaved={close} />
          </Dialog>
        </>
      ) : null}
    </div>
  );
};
