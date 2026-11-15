import { setLoginPassword } from "../services/logins.js";
import { readNewPassword } from "./readPassword.js";
import { requiredId, runCommand } from "./run.js";

await runCommand(
  "pnpm --filter @repo/backend login:set-password --member-id <id>",
  { "member-id": { type: "string" } },
  async (db, values) => {
    const memberId = requiredId(values, "member-id");
    await setLoginPassword(db, memberId, await readNewPassword());
    return `New password set for member ${memberId}; their existing sessions were ended.`;
  },
);
