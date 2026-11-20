import { email as emailSchema } from "@repo/shared";
import { LOGIN_ROLES, type LoginRole } from "@repo/shared/auth";
import { config } from "../config.js";
import { systemActor } from "../services/audit.js";
import { isoDateIn } from "../services/dates.js";
import { createLoginForMember, createMemberWithLogin } from "../services/logins.js";
import { readNewPassword } from "./readPassword.js";
import { required, requiredId, runCommand, systemActorFor } from "./run.js";

const usage = `pnpm --filter @repo/backend login:create --member-id <id> --role <${LOGIN_ROLES.join("|")}>
   or: pnpm --filter @repo/backend login:create --org-id <id> --name <name> --surname <surname> [--birthday <YYYY-MM-DD>] --email <email> --role <${LOGIN_ROLES.join("|")}>`;

const loginRole = (value: string): LoginRole => {
  const role = LOGIN_ROLES.find((candidate) => candidate === value);
  if (!role) {
    throw new Error(`--role must be one of: ${LOGIN_ROLES.join(", ")}`);
  }
  return role;
};

await runCommand(
  usage,
  {
    "member-id": { type: "string" },
    "org-id": { type: "string" },
    name: { type: "string" },
    surname: { type: "string" },
    birthday: { type: "string" },
    email: { type: "string" },
    role: { type: "string" },
  },
  async (db, values) => {
    const role = loginRole(required(values, "role"));

    if (values["member-id"]) {
      const memberId = requiredId(values, "member-id");
      await createLoginForMember(
        db,
        await systemActorFor(db, memberId),
        memberId,
        role,
        await readNewPassword(),
        isoDateIn(new Date(), config.GYM_TIME_ZONE),
      );
      return `Member ${memberId} is now ${role} and can log in with their member email.`;
    }

    const memberId = await createMemberWithLogin(
      db,
      systemActor(requiredId(values, "org-id")),
      {
        name: required(values, "name"),
        surname: required(values, "surname"),
        birthday: values["birthday"],
        email: required(values, "email"),
      },
      role,
      await readNewPassword(),
    );
    return `Created member ${memberId} as ${role}; they can log in with ${emailSchema.parse(required(values, "email"))}.`;
  },
);
