import type { MemberRole } from "../types/member.js";

// Roles that may log in. The partial unique index on member.email in
// schema.prisma lists the same roles; change both together.
export const LOGIN_ROLES = ["trainer", "admin"] as const satisfies readonly MemberRole[];
export type LoginRole = (typeof LOGIN_ROLES)[number];

export const isLoginRole = (role: MemberRole): role is LoginRole => (LOGIN_ROLES as readonly MemberRole[]).includes(role);
