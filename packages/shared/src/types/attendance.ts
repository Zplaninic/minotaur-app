import { z } from "zod";
import { id } from "./common.js";

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

export const attendanceMemberResponse = z.object({
  id,
  name: z.string(),
  surname: z.string(),
  attendedSessionIds: z.array(id),
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
