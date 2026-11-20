import type { FastifyRequest } from "fastify";
import { AppError } from "../errors.js";
import type { Actor } from "../services/audit.js";

// The logged-in member making the request, with their org. Only called behind
// requireAbility or requireSession, so a missing session is a 401 like theirs.
export const actorOf = (request: FastifyRequest): Actor => {
  if (!request.auth) {
    throw new AppError("UNAUTHORIZED", 401, "Log in first");
  }
  return request.auth.actor;
};

// The org whose records the request may read.
export const orgIdOf = (request: FastifyRequest): number => actorOf(request).orgId;
