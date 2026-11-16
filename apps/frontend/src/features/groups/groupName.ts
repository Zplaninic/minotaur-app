import type { GroupResponse } from "@repo/shared";
import { formatPersonName, formatTimeOfDay } from "../../lib/format";
import { type Translate, weekdayKey } from "../../lib/messages";

// A group has no name of its own; it is named after its trainer and schedule.
export const groupName = (group: GroupResponse, t: Translate): string =>
  t("groups.name", {
    trainer: formatPersonName(group.owner),
    days: group.days.map((day) => t(weekdayKey(day))).join(", "),
    from: formatTimeOfDay(group.from),
    to: formatTimeOfDay(group.to),
  });
