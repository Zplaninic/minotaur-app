import { z } from "zod";
import { id } from "./common.js";
import { priceCents, sessionsPerWeek } from "./subscription.js";

// Attendance starts with this month; there is nothing before it.
export const FIRST_MONTH = "2026-09";

// A calendar month, YYYY-MM, from FIRST_MONTH on. YYYY-MM strings sort like
// the months they stand for.
export const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine((value) => value >= FIRST_MONTH, { message: `The first month is ${FIRST_MONTH}` });
export type Month = z.infer<typeof month>;

export const monthQuery = z.object({ month });
export type MonthQuery = z.infer<typeof monthQuery>;

export const createMonthSessionsBody = z.object({ month });
export type CreateMonthSessionsBody = z.infer<typeof createMonthSessionsBody>;

export const createTrainingSessionBody = z.object({ date: z.iso.date() });
export type CreateTrainingSessionBody = z.infer<typeof createTrainingSessionBody>;

export const trainingSessionResponse = z.object({
  id,
  date: z.iso.date(),
});
export type TrainingSessionResponse = z.infer<typeof trainingSessionResponse>;

// A member's subscription for one month in one group. sessionsPerWeek and
// price are as they were when it was set; name is the subscription's current name.
export const monthMemberSubscription = z.object({
  id,
  name: z.string(),
  sessionsPerWeek,
  price: priceCents,
});
export type MonthMemberSubscription = z.infer<typeof monthMemberSubscription>;

export const MAX_MONTH_COMMENT_LENGTH = 500;

// A trainer's note on a member for one month. Blank text means no comment.
export const monthComment = z
  .string()
  .trim()
  .max(MAX_MONTH_COMMENT_LENGTH)
  .transform((value) => (value === "" ? null : value));

export const attendanceMemberResponse = z.object({
  id,
  name: z.string(),
  surname: z.string(),
  attendedSessionIds: z.array(id),
  subscription: monthMemberSubscription.nullable(),
  // Whether the member paid for this month.
  paid: z.boolean(),
  // The same in all the member's groups, like paid.
  comment: z.string().nullable(),
});
export type AttendanceMemberResponse = z.infer<typeof attendanceMemberResponse>;

// One group's month: its sessions by date, its current members by surname, name.
export const groupAttendanceResponse = z.object({
  sessions: z.array(trainingSessionResponse),
  members: z.array(attendanceMemberResponse),
});
export type GroupAttendanceResponse = z.infer<typeof groupAttendanceResponse>;

export const trainingSessionParams = z.object({ id, sessionId: id });
export type TrainingSessionParams = z.infer<typeof trainingSessionParams>;

export const attendanceParams = z.object({ id, sessionId: id, memberId: id });
export type AttendanceParams = z.infer<typeof attendanceParams>;

export const monthMemberParams = z.object({ id, month, memberId: id });
export type MonthMemberParams = z.infer<typeof monthMemberParams>;

// joinGroup also makes the member a member of the group, not only of the month.
export const addMonthMemberBody = z.object({ joinGroup: z.boolean() });
export type AddMonthMemberBody = z.infer<typeof addMonthMemberBody>;

// null clears the member's subscription for the month.
export const setMonthSubscriptionBody = z.object({ subscriptionId: id.nullable() });
export type SetMonthSubscriptionBody = z.infer<typeof setMonthSubscriptionBody>;

export const setMonthPaidBody = z.object({ paid: z.boolean() });
export type SetMonthPaidBody = z.infer<typeof setMonthPaidBody>;

// null or blank text clears the comment.
export const setMonthCommentBody = z.object({ comment: monthComment.nullable() });
export type SetMonthCommentBody = z.input<typeof setMonthCommentBody>;
