import { memberRole } from "@repo/shared";
import { config } from "../config.js";
import { isoDateIn } from "../services/attendance.js";
import { setMemberRole } from "../services/logins.js";
import { required, requiredId, runCommand } from "./run.js";

await runCommand(
  `pnpm --filter @repo/backend member:set-role --member-id <id> --role <${memberRole.options.join("|")}>`,
  { "member-id": { type: "string" }, role: { type: "string" } },
  async (db, values) => {
    const memberId = requiredId(values, "member-id");
    const parsed = memberRole.safeParse(required(values, "role"));
    if (!parsed.success) {
      throw new Error(`--role must be one of: ${memberRole.options.join(", ")}`);
    }
    await setMemberRole(db, memberId, parsed.data, isoDateIn(new Date(), config.GYM_TIME_ZONE));
    return `Member ${memberId} is now ${parsed.data}.`;
  },
);
