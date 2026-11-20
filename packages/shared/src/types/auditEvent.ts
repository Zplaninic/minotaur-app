import { z } from "zod";
import { id, MAX_PAGE_SIZE } from "./common.js";
import { groupOwnerResponse, timeOfDay, weekday } from "./group.js";
import { month } from "./attendance.js";

// Mirrored by the Postgres enum audit_action.
export const auditAction = z.enum([
  "member_created",
  "member_updated",
  "member_archived",
  "member_role_changed",
  "member_new_set",
  "login_created",
  "login_password_set",
  "group_created",
  "group_updated",
  "group_archived",
  "group_member_added",
  "group_member_removed",
  "training_session_added",
  "training_session_deleted",
  "month_sessions_created",
  "attendance_marked",
  "attendance_unmarked",
  "month_member_added",
  "month_member_removed",
  "month_subscription_set",
  "month_paid_set",
  "month_comment_set",
  "subscription_created",
  "subscription_updated",
  "enrollment_request_created",
  "enrollment_request_deleted",
  "enrollment_child_group_set",
  "enrollment_child_accepted",
  "enrollment_child_rejected",
  "enrollment_child_reopened",
]);
export type AuditAction = z.infer<typeof auditAction>;

export const auditPerson = z.object({ id, name: z.string(), surname: z.string() });
export type AuditPerson = z.infer<typeof auditPerson>;

export const auditSubscription = z.object({ id, name: z.string() });
export type AuditSubscription = z.infer<typeof auditSubscription>;

// A changed value that points at another record, resolved to its current name.
export const auditRef = z.discriminatedUnion("kind", [
  auditPerson.extend({ kind: z.literal("member") }),
  auditSubscription.extend({ kind: z.literal("subscription") }),
]);
export type AuditRef = z.infer<typeof auditRef>;

export const auditValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string()), auditRef]);
export type AuditValue = z.infer<typeof auditValue>;

// Personal values are never copied into the log; their change is only marked.
export const auditChange = z.union([
  z.object({ from: auditValue, to: auditValue }),
  z.object({ changed: z.literal(true) }),
]);
export type AuditChange = z.infer<typeof auditChange>;

export const auditGroup = z.object({
  id,
  owner: groupOwnerResponse,
  days: z.array(weekday),
  from: timeOfDay,
  to: timeOfDay,
});
export type AuditGroup = z.infer<typeof auditGroup>;

export const auditEventResponse = z.object({
  id,
  action: auditAction,
  createdAt: z.iso.datetime(),
  // Who did it; null for the system (backend commands).
  actor: auditPerson.nullable(),
  member: auditPerson.nullable(),
  group: auditGroup.nullable(),
  subscription: auditSubscription.nullable(),
  // The enrollment request, while it still exists.
  enrollmentRequestId: id.nullable(),
  // The child of the request the event is about, while the request exists.
  enrollmentChild: z.object({ id, name: z.string() }).nullable(),
  month: month.nullable(),
  // The training session's date, for session and attendance events.
  date: z.iso.date().nullable(),
  changes: z.record(z.string(), auditChange),
});
export type AuditEventResponse = z.infer<typeof auditEventResponse>;

export const DEFAULT_AUDIT_PAGE_SIZE = 50;

// Newest first. before is the id of the last event of the previous page.
export const listAuditEventsQuery = z.object({
  before: id.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_AUDIT_PAGE_SIZE),
  actorId: id.optional(),
  memberId: id.optional(),
  groupId: id.optional(),
  action: auditAction.optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type ListAuditEventsQuery = z.infer<typeof listAuditEventsQuery>;
export type ListAuditEventsInput = z.input<typeof listAuditEventsQuery>;

export const listAuditEventsResponse = z.object({
  items: z.array(auditEventResponse),
  // Pass as before to get the next page; null on the last page.
  nextCursor: id.nullable(),
});
export type ListAuditEventsResponse = z.infer<typeof listAuditEventsResponse>;
