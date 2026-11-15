import { errorResponse } from "@repo/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "../errors.js";
import { errorHandlerPlugin } from "./errorHandler.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(errorHandlerPlugin);

  const routes = app.withTypeProvider<ZodTypeProvider>();
  routes.post("/echo", { schema: { body: z.object({ name: z.string().min(1) }) } }, async (request) => request.body);
  routes.get("/conflict", async () => {
    throw new AppError("CONFLICT", 409, "Already exists");
  });
  routes.get("/crash", async () => {
    throw new Error("secret internal detail");
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("errorHandlerPlugin", () => {
  it("maps a request validation failure to VALIDATION_ERROR", async () => {
    const response = await app.inject({ method: "POST", url: "/echo", payload: { name: "" } });
    expect(response.statusCode).toBe(400);
    expect(errorResponse.parse(response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("maps a typed service error to its code and status", async () => {
    const response = await app.inject({ method: "GET", url: "/conflict" });
    expect(response.statusCode).toBe(409);
    expect(errorResponse.parse(response.json()).code).toBe("CONFLICT");
  });

  it("hides internal details of unknown errors", async () => {
    const response = await app.inject({ method: "GET", url: "/crash" });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("secret internal detail");
    expect(errorResponse.parse(response.json()).code).toBe("INTERNAL_ERROR");
  });
});
