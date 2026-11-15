import { z } from "zod";
import { id } from "./common.js";

// Contact name and email are internal and stay out of the response.
export const orgResponse = z.object({
  id,
  name: z.string(),
});
export type OrgResponse = z.infer<typeof orgResponse>;

export const listOrgsResponse = z.object({
  items: z.array(orgResponse),
});
export type ListOrgsResponse = z.infer<typeof listOrgsResponse>;
