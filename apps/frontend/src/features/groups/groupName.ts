import { groupAgeRangeKind } from "@repo/shared/client";
import type { GroupResponse } from "@repo/shared";
import { formatNumber, formatPersonName, formatTimeOfDay } from "../../lib/format";
import { groupAgeKey, type Translate, weekdayKey } from "../../lib/messages";

const formatAge = (age: number | null): string => (age === null ? "" : formatNumber(age));

// The group's age range, e.g. "7–10 yrs", or null when it has none.
export const groupAgeRange = (group: GroupResponse, t: Translate): string | null => {
  const kind = groupAgeRangeKind(group);
  return kind === null ? null : t(groupAgeKey(kind), { from: formatAge(group.ageFrom), to: formatAge(group.ageTo) });
};

// A group has no name of its own; it is named after its trainer, age range and schedule.
export const groupName = (group: GroupResponse, t: Translate): string => {
  const params = {
    trainer: formatPersonName(group.owner),
    days: group.days.map((day) => t(weekdayKey(day))).join(", "),
    from: formatTimeOfDay(group.from),
    to: formatTimeOfDay(group.to),
  };
  const age = groupAgeRange(group, t);
  return age === null ? t("groups.name", params) : t("groups.nameWithAge", { ...params, age });
};
