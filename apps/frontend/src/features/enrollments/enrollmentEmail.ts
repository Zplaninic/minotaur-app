import type { EnrollmentRequestResponse, GroupResponse } from "@repo/shared";
import { formatTimeOfDay } from "@repo/shared/client";
import { formatPersonName } from "../../lib/format";
import type { Language } from "../../lib/i18n";
import { translateIn, weekdayKey, type Translate } from "../../lib/messages";

export type EnrollmentEmail = { to: string; subject: string; body: string };

const groupLine = (group: GroupResponse, t: Translate, language: Language): string =>
  t("enrollmentEmail.group", {
    days: group.days.map((day) => t(weekdayKey(day))).join(", "),
    from: formatTimeOfDay(group.from, language),
    to: formatTimeOfDay(group.to, language),
    trainer: formatPersonName(group.owner),
  });

// The reply to the parent, filled from the template in the given language:
// one line per child who was not rejected, with their group. The admin edits
// it before sending.
export const enrollmentEmail = (
  request: EnrollmentRequestResponse,
  groups: readonly GroupResponse[],
  language: Language,
): EnrollmentEmail => {
  const t = translateIn(language);
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const children = request.children
    .filter((child) => child.status !== "rejected")
    .map((child) => {
      const group = child.groupId === null ? undefined : groupsById.get(child.groupId);
      return group
        ? t("enrollmentEmail.child", { name: child.name, group: groupLine(group, t, language) })
        : t("enrollmentEmail.childNoGroup", { name: child.name });
    });
  // With every child rejected there are no groups to suggest, only a polite no.
  const message =
    children.length === 0
      ? [t("enrollmentEmail.noPlace")]
      : [t("enrollmentEmail.intro"), "", ...children.map((line) => `- ${line}`), "", t("enrollmentEmail.outro")];
  const body = [
    t("enrollmentEmail.greeting", { name: request.parentName }),
    "",
    ...message,
    "",
    t("enrollmentEmail.signature"),
    t("app.clubName"),
  ].join("\n");
  return { to: request.parentEmail ?? "", subject: t("enrollmentEmail.subject"), body };
};

export const mailtoHref = (email: EnrollmentEmail): string =>
  `mailto:${encodeURIComponent(email.to)}?${new URLSearchParams({ subject: email.subject, body: email.body })
    .toString()
    .replaceAll("+", "%20")}`;
