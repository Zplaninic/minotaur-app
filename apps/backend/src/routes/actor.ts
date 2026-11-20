import type { FastifyRequest } from "fastify";
import { AppError } from "../errors.js";
import type { Actor } from "../services/audit.js";
import { toDbId } from "../services/ids.js";

// The logged-in member making the change. Only called behind requireAbility
// or requireSession, so a missing session is a 401 like theirs.
export const actorOf = (request: FastifyRequest): Actor => {
  const memberId = request.auth ? toDbId(request.auth.me.memberId) : undefined;
  if (memberId === undefined) {
    throw new AppError("UNAUTHORIZED", 401, "Log in first");
  }
  return { memberId };
};
