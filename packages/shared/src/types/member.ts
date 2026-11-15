import { z } from "zod";
import { id, paginatedResponse, paginationQuery } from "./common.js";
import { createGuardianBody, guardianResponse } from "./guardian.js";
import { email, personName, phone } from "./person.js";

// Members younger than this need at least one guardian.
export const ADULT_AGE = 18;

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
  birthday: z.iso.date(),
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

export const memberResponse = z.object({
  id,
  orgId: id,
  name: z.string(),
  surname: z.string(),
  birthday: z.iso.date(),
  taxNumber: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  guardians: z.array(guardianResponse),
  createdAt: z.iso.datetime(),
});
export type MemberResponse = z.infer<typeof memberResponse>;

export const listMembersQuery = paginationQuery;
export type ListMembersQuery = z.infer<typeof listMembersQuery>;

export const listMembersResponse = paginatedResponse(memberResponse);
export type ListMembersResponse = z.infer<typeof listMembersResponse>;
