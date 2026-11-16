import { z } from "zod";
import { month } from "./attendance.js";
import { id } from "./common.js";

const count = z.number().int().min(0);

// A member on a roster this month whose month has no subscription yet.
// groupIds are the groups whose roster they are on this month, by id.
export const dashboardMemberWithoutSubscription = z.object({
  id,
  name: z.string(),
  surname: z.string(),
  groupIds: z.array(id).min(1),
});
export type DashboardMemberWithoutSubscription = z.infer<typeof dashboardMemberWithoutSubscription>;

export const dashboardResponse = z.object({
  // Today and its month at the gym.
  today: z.iso.date(),
  month,
  // Not archived, with a role that trains in groups.
  activeMembers: count,
  // By surname, name. Archived members are left out.
  withoutSubscription: z.array(dashboardMemberWithoutSubscription),
  // Over this month's sessions up to and including today: expected sums each
  // session's roster size, attended counts the attendance marked.
  attendance: z.object({
    expected: count,
    attended: count,
  }),
});
export type DashboardResponse = z.infer<typeof dashboardResponse>;
