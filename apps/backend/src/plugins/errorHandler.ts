import type { ErrorResponse } from "@repo/shared";
import fp from "fastify-plugin";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { AppError } from "../errors.js";
import { Prisma } from "../generated/prisma/client.js";

type MappedError = { statusCode: number; body: ErrorResponse };

const UNIQUE_CONSTRAINT = "P2002";
const RECORD_NOT_FOUND = "P2025";

const internalError: MappedError = {
  statusCode: 500,
  body: { code: "INTERNAL_ERROR", message: "Something went wrong" },
};

const mapError = (error: unknown): MappedError => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    return { statusCode: 400, body: { code: "VALIDATION_ERROR", message: "Request validation failed" } };
  }
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, body: { code: error.code, message: error.message } };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === UNIQUE_CONSTRAINT) {
      return { statusCode: 409, body: { code: "CONFLICT", message: "Resource already exists" } };
    }
    if (error.code === RECORD_NOT_FOUND) {
      return { statusCode: 404, body: { code: "NOT_FOUND", message: "Resource not found" } };
    }
  }
  return internalError;
};

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapError(error);
    if (mapped.statusCode >= 500) {
      request.log.error({ err: error }, "request failed");
    }
    return reply.status(mapped.statusCode).send(mapped.body);
  });

  app.setNotFoundHandler((_request, reply) => {
    const body: ErrorResponse = { code: "NOT_FOUND", message: "Route not found" };
    return reply.status(404).send(body);
  });
});
