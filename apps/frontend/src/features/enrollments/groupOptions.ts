import type { GroupResponse } from "@repo/shared";
import { formatNumber } from "../../lib/format";
import type { Translate } from "../../lib/messages";
import { groupName } from "../groups/groupName";

// Waiting children recommended to each group, by group id.
export type WaitingByGroup = Readonly<Record<string, number>>;

// Each group with its members, the waiting children already recommended to
// it, and, when it has a limit, the places left after both.
export const groupOptions = (groups: readonly GroupResponse[], waitingByGroup: WaitingByGroup, t: Translate) =>
  groups.map((group) => {
    const waiting = waitingByGroup[group.id] ?? 0;
    const count = formatNumber(group.memberCount);
    const parts = [
      group.maxMembers === null
        ? t("enrollments.groupMembers", { count })
        : t("enrollments.groupMembersOf", { count, max: formatNumber(group.maxMembers) }),
      ...(waiting > 0 ? [t("enrollments.groupWaiting", { count: formatNumber(waiting) })] : []),
    ];
    if (group.maxMembers !== null) {
      const free = Math.max(0, group.maxMembers - group.memberCount - waiting);
      parts.push(free === 0 ? t("enrollments.groupFull") : t("enrollments.groupFree", { count: formatNumber(free) }));
    }
    return { value: group.id, label: `${groupName(group, t)} · ${parts.join(", ")}` };
  });
