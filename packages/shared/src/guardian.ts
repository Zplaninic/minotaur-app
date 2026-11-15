import { z } from "zod";
import { id } from "./common.js";
import { email, personName, phone } from "./person.js";

export const createGuardianBody = z.object({
  name: personName,
  surname: personName,
  email: email.optional(),
  phone: phone.optional(),
});
export type CreateGuardianBody = z.infer<typeof createGuardianBody>;

export const guardianResponse = z.object({
  id,
  name: z.string(),
  surname: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});
export type GuardianResponse = z.infer<typeof guardianResponse>;

export const listGuardiansResponse = z.object({
  items: z.array(guardianResponse),
});
export type ListGuardiansResponse = z.infer<typeof listGuardiansResponse>;
