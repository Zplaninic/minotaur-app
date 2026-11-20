import type { GroupResponse } from "@repo/shared";
import { isGroupOverLimit } from "@repo/shared/client";
import { formatNumber } from "../../lib/format";
import { useMessages } from "../../lib/messages";
import styles from "./GroupMemberCount.module.css";

type GroupMemberCountProps = {
  group: Pick<GroupResponse, "maxMembers" | "memberCount">;
};

// "12" without a limit, "12 / 15" with one, and a badge when over the limit.
export const GroupMemberCount = ({ group }: GroupMemberCountProps) => {
  const { t } = useMessages();
  const count = formatNumber(group.memberCount);
  return (
    <span className={styles.count}>
      {group.maxMembers === null ? count : t("groups.memberLimit", { count, max: formatNumber(group.maxMembers) })}
      {isGroupOverLimit(group) ? <span className={styles.badge}>{t("groups.overLimit")}</span> : null}
    </span>
  );
};
