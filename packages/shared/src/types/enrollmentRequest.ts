import { z } from "zod";
import { id, paginatedResponse, paginationQuery } from "./common.js";
import { email, personName, phone } from "./person.js";

// Mirrored by the Postgres enum enrollment_child_status.
export const enrollmentChildStatus = z.enum(["pending", "accepted", "rejected"]);
export type EnrollmentChildStatus = z.infer<typeof enrollmentChildStatus>;

export const MAX_ENROLLMENT_AGE = 99.9;
export const MAX_ENROLLMENT_CHILDREN = 10;
export const MAX_ENROLLMENT_TEXT_LENGTH = 10_000;

// Years with at most one decimal, as parents write them: 4.5. Compared with a
// tolerance because 4.1 * 10 is not exactly 41 in floating point.
export const enrollmentAge = z
  .number()
  .min(0)
  .max(MAX_ENROLLMENT_AGE)
  .refine((age) => Math.abs(age * 10 - Math.round(age * 10)) < 1e-9, { message: "At most one decimal" });

export const enrollmentChildBody = z.object({
  name: personName,
  age: enrollmentAge,
});
export type EnrollmentChildBody = z.infer<typeof enrollmentChildBody>;

export const createEnrollmentRequestBody = z.object({
  parentName: personName,
  parentSurname: personName.optional(),
  parentPhone: phone.optional(),
  parentEmail: email.optional(),
  // The email the request was read from, kept to check what the parser read.
  rawText: z.string().max(MAX_ENROLLMENT_TEXT_LENGTH).optional(),
  children: z.array(enrollmentChildBody).min(1).max(MAX_ENROLLMENT_CHILDREN),
});
export type CreateEnrollmentRequestBody = z.infer<typeof createEnrollmentRequestBody>;

export const enrollmentRequestParams = z.object({ id });
export type EnrollmentRequestParams = z.infer<typeof enrollmentRequestParams>;

export const enrollmentChildParams = z.object({ id, childId: id });
export type EnrollmentChildParams = z.infer<typeof enrollmentChildParams>;

// Null clears the group.
export const setEnrollmentChildGroupBody = z.object({ groupId: id.nullable() });
export type SetEnrollmentChildGroupBody = z.infer<typeof setEnrollmentChildGroupBody>;

// The form has no child surname; the admin confirms one, prefilled from the parent's.
export const acceptEnrollmentChildBody = z.object({
  surname: personName,
  groupId: id,
});
export type AcceptEnrollmentChildBody = z.infer<typeof acceptEnrollmentChildBody>;

export const enrollmentChildResponse = z.object({
  id,
  name: z.string(),
  age: z.number(),
  status: enrollmentChildStatus,
  // The recommended group, or the one the admin chose instead.
  groupId: id.nullable(),
  // The member created on accept.
  memberId: id.nullable(),
});
export type EnrollmentChildResponse = z.infer<typeof enrollmentChildResponse>;

export const enrollmentRequestResponse = z.object({
  id,
  parentName: z.string(),
  parentSurname: z.string().nullable(),
  parentPhone: z.string().nullable(),
  parentEmail: z.string().nullable(),
  rawText: z.string().nullable(),
  children: z.array(enrollmentChildResponse),
  createdAt: z.iso.datetime(),
});
export type EnrollmentRequestResponse = z.infer<typeof enrollmentRequestResponse>;

// open: at least one child is still pending. closed: none is pending and at
// least one was accepted. rejected: at least one child was rejected, so a
// request can be both closed and rejected.
export const enrollmentRequestState = z.enum(["open", "closed", "rejected"]);
export type EnrollmentRequestState = z.infer<typeof enrollmentRequestState>;

// Newest first.
export const listEnrollmentRequestsQuery = paginationQuery.extend({
  state: enrollmentRequestState.default("open"),
});
export type ListEnrollmentRequestsQuery = z.infer<typeof listEnrollmentRequestsQuery>;

export const listEnrollmentRequestsResponse = paginatedResponse(enrollmentRequestResponse).extend({
  // Waiting children recommended to each group, over all requests, by group id.
  // They count against a group's free places.
  waitingByGroup: z.record(id, z.number().int().min(0)),
});
export type ListEnrollmentRequestsResponse = z.infer<typeof listEnrollmentRequestsResponse>;
