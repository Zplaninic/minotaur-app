import { memberRole, weekday, type AuditChange, type AuditValue } from "@repo/shared";
import { formatMoney, formatNumber, formatPersonName, formatTimeOfDay } from "../../lib/format";
import { auditFieldKey, roleKey, type Translate, weekdayKey } from "../../lib/messages";

const formatValue = (field: string, value: AuditValue, t: Translate): string => {
  if (value === null || value === "") {
    return t("common.empty");
  }
  if (typeof value === "boolean") {
    return value ? t("activity.yes") : t("activity.no");
  }
  if (Array.isArray(value)) {
    return field === "days"
      ? value
          .map((item) => {
            const day = weekday.safeParse(item);
            return day.success ? t(weekdayKey(day.data)) : item;
          })
          .join(", ")
      : value.join(", ");
  }
  if (typeof value === "object") {
    return value.kind === "member" ? formatPersonName(value) : value.name;
  }
  if (typeof value === "number") {
    return field === "price" ? formatMoney(value) : formatNumber(value);
  }
  if (field === "from" || field === "to") {
    return formatTimeOfDay(value);
  }
  const role = memberRole.safeParse(value);
  return field === "role" && role.success ? t(roleKey(role.data)) : value;
};

// One line per changed field, e.g. "Paid: no → yes" or "Email changed".
export const describeChanges = (changes: Record<string, AuditChange>, t: Translate): string[] =>
  Object.entries(changes).map(([field, change]) => {
    const key = auditFieldKey(field);
    const label = key ? t(key) : field;
    return "changed" in change
      ? t("activity.changedField", { field: label })
      : t("activity.change", {
          field: label,
          from: formatValue(field, change.from, t),
          to: formatValue(field, change.to, t),
        });
  });
