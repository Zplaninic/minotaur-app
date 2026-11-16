import { z } from "zod";
import { id, paginatedResponse, paginationQuery } from "./common.js";
import { createGuardianBody, guardianResponse } from "./guardian.js";
import { email, personName, phone } from "./person.js";

// Members younger than this need at least one guardian.
export const ADULT_AGE = 18;

// Mirrored by the Postgres enum member_role.
export const memberRole = z.enum(["child", "member", "trainer", "admin"]);
export type MemberRole = z.infer<typeof memberRole>;

// Every member created through the API gets this role.
export const DEFAULT_MEMBER_ROLE: MemberRole = "child";

// Nobody alive was born before this; it also keeps typos like year 0202 out.
export const MIN_BIRTHDAY = "1900-01-01";

// A calendar date, YYYY-MM-DD. ISO dates sort like the days they stand for.
// That it is not in the future is checked against today, by the form and the backend.
export const birthday = z.iso
  .date()
  .refine((value) => value >= MIN_BIRTHDAY, { message: `The earliest birthday is ${MIN_BIRTHDAY}` });

// Croatian OIB format: 11 digits. The checksum is not verified.
export const taxNumber = z.string().trim().regex(/^\d{11}$/);

export const memberGuardianInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), guardianId: id }),
  createGuardianBody.extend({ kind: z.literal("new") }),
]);
export type MemberGuardianInput = z.infer<typeof memberGuardianInput>;

export const createMemberBody = z.object({
  orgId: id,
  name: personName,
  surname: personName,
  birthday,
  taxNumber: taxNumber.optional(),
  email: email.optional(),
  phone: phone.optional(),
  guardians: z
    .array(memberGuardianInput)
    .default([])
    .refine(
      (guardians) => {
        const existingIds = guardians.flatMap((guardian) => (guardian.kind === "existing" ? [guardian.guardianId] : []));
        return new Set(existingIds).size === existingIds.length;
      },
      { message: "The same guardian is listed twice" },
    ),
});
export type CreateMemberBody = z.infer<typeof createMemberBody>;
export type CreateMemberInput = z.input<typeof createMemberBody>;

// Replaces a member's editable fields: a missing OIB, email or phone is
// cleared, and the guardian list becomes exactly this one. The org and the
// role are not editable.
export const updateMemberBody = createMemberBody.omit({ orgId: true });
export type UpdateMemberBody = z.infer<typeof updateMemberBody>;

export const memberParams = z.object({ id });
export type MemberParams = z.infer<typeof memberParams>;

export const memberResponse = z.object({
  id,
  orgId: id,
  name: z.string(),
  surname: z.string(),
  birthday: z.iso.date(),
  role: memberRole,
  taxNumber: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  guardians: z.array(guardianResponse),
  createdAt: z.iso.datetime(),
});
export type MemberResponse = z.infer<typeof memberResponse>;

export const listMembersQuery = paginationQuery.extend({
  // Only members with this role.
  role: memberRole.optional(),
});
export type ListMembersQuery = z.infer<typeof listMembersQuery>;

export const listMembersResponse = paginatedResponse(memberResponse);
export type ListMembersResponse = z.infer<typeof listMembersResponse>;
