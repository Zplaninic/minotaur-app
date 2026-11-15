import { describe, expect, it } from "vitest";
import { memberRole } from "../types/member.js";
import { defineAbilityFor, emptyAbility } from "./abilities.js";
import { isLoginRole, LOGIN_ROLES } from "./roles.js";

describe("defineAbilityFor", () => {
  it.each(["admin", "trainer"] as const)("lets %s do everything", (role) => {
    const ability = defineAbilityFor({ memberId: "1", role });
    expect(ability.can("create", "Member")).toBe(true);
    expect(ability.can("read", "Guardian")).toBe(true);
    expect(ability.can("delete", "Org")).toBe(true);
  });

  it.each(["member", "child"] as const)("lets %s do nothing", (role) => {
    const ability = defineAbilityFor({ memberId: "1", role });
    expect(ability.can("read", "Member")).toBe(false);
    expect(ability.can("create", "Member")).toBe(false);
  });

  it("allows nothing when logged out", () => {
    expect(emptyAbility().can("read", "Member")).toBe(false);
  });
});

describe("login roles", () => {
  it("are trainer and admin only", () => {
    expect(memberRole.options.filter(isLoginRole)).toEqual([...LOGIN_ROLES]);
  });
});
