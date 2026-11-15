import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { config } from "./config.js";
import { dbPlugin } from "./plugins/db.js";
import { errorHandlerPlugin } from "./plugins/errorHandler.js";
import { guardianRoutes } from "./routes/guardians.js";
import { memberRoutes } from "./routes/members.js";
import { orgRoutes } from "./routes/orgs.js";

export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      serializers: {
        // The default request serializer logs the client IP address and the
        // query string, both of which can be personal data.
        req: (request) => ({ method: request.method, path: request.url.split("?")[0] }),
      },
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(dbPlugin);

  await app.register(orgRoutes, { prefix: "/orgs" });
  await app.register(guardianRoutes, { prefix: "/guardians" });
  await app.register(memberRoutes, { prefix: "/members" });

  return app;
};
