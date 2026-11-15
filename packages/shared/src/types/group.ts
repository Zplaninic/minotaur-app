import { z } from "zod";
import { id } from "./common.js";

// In week order. Mirrored by the Postgres enum weekday.
export const weekday = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
export type Weekday = z.infer<typeof weekday>;

// The role a group's owner must have.
export const GROUP_OWNER_ROLE = "trainer";

// Wall-clock time at the gym, 24-hour HH:mm. Not tied to a date or a time zone.
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export type TimeOfDay = z.infer<typeof timeOfDay>;

export const createGroupBody = z
  .object({
    ownerId: id,
    days: z
      .array(weekday)
      .min(1)
      .refine((days) => new Set(days).size === days.length, { message: "The same day is listed twice" }),
    from: timeOfDay,
    to: timeOfDay,
  })
  // HH:mm strings sort like the times they stand for.
  .refine((group) => group.from < group.to, { path: ["to"], message: "The end must be after the start" });
export type CreateGroupBody = z.infer<typeof createGroupBody>;

export const groupOwnerResponse = z.object({
  id,
  name: z.string(),
  surname: z.string(),
});
export type GroupOwnerResponse = z.infer<typeof groupOwnerResponse>;

export const groupResponse = z.object({
  id,
  owner: groupOwnerResponse,
  days: z.array(weekday),
  from: timeOfDay,
  to: timeOfDay,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type GroupResponse = z.infer<typeof groupResponse>;

export const listGroupsResponse = z.object({
  items: z.array(groupResponse),
});
export type ListGroupsResponse = z.infer<typeof listGroupsResponse>;
