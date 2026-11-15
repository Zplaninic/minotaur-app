import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import type { MemberRole } from "../types/member.js";

export type Action = "manage" | "read" | "create" | "update" | "delete";
export type Subject = "Org" | "Guardian" | "Member" | "all";
export type AppAbility = MongoAbility<[Action, Subject]>;

export type AbilityUser = { memberId: string; role: MemberRole };

// The only place that says what each role may do. The backend enforces it;
// the apps use it to hide what is not allowed.
export const defineAbilityFor = (user: AbilityUser): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (user.role) {
    case "admin":
    case "trainer":
      can("manage", "all");
      break;
    case "member":
    case "child":
      // No rights yet; these roles cannot log in.
      break;
  }

  return build();
};

// For logged-out users: allows nothing.
export const emptyAbility = (): AppAbility => createMongoAbility<AppAbility>([]);
