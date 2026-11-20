import { z } from "zod";
import { id } from "./common.js";
import { birthday } from "./member.js";
import { email, personName } from "./person.js";
import { MAX_SUBSCRIPTION_NAME_LENGTH } from "./subscription.js";

export const MAX_IMPORT_ROWS = 500;

// One member from an imported file. The guardian has a name only; a guardian
// with an email is matched to an existing guardian with that email.
export const importMemberRow = z
  .object({
    name: personName,
    surname: personName,
    birthday: birthday.optional(),
    guardianName: personName.optional(),
    guardianEmail: email.optional(),
    // A subscription's name, set on the member's current month.
    subscription: z.string().trim().min(1).max(MAX_SUBSCRIPTION_NAME_LENGTH).optional(),
  })
  .refine((row) => row.guardianEmail === undefined || row.guardianName !== undefined, {
    path: ["guardianName"],
    message: "A guardian with an email needs a name",
  });
export type ImportMemberRow = z.infer<typeof importMemberRow>;

export const importMembersBody = z.object({
  orgId: id,
  rows: z.array(importMemberRow).min(1).max(MAX_IMPORT_ROWS),
  // Checks the rows and reports what would happen, without writing anything.
  dryRun: z.boolean(),
});
export type ImportMembersBody = z.infer<typeof importMembersBody>;

// create: the row becomes a new member. duplicate: an active member, or an
// earlier row, has the same name, surname and birthday, so the row is skipped.
// invalid: the row has problems, and nothing is imported until they are fixed.
export const importRowStatus = z.enum(["create", "duplicate", "invalid"]);
export type ImportRowStatus = z.infer<typeof importRowStatus>;

export const importRowProblem = z.enum(["birthdayInFuture", "guardianRequired", "subscriptionNotFound"]);
export type ImportRowProblem = z.infer<typeof importRowProblem>;

export const importMembersResponse = z.object({
  // True when the members were created: not a dry run, and no row is invalid.
  imported: z.boolean(),
  // In the order of the request's rows.
  rows: z.array(z.object({ status: importRowStatus, problems: z.array(importRowProblem) })),
});
export type ImportMembersResponse = z.infer<typeof importMembersResponse>;
