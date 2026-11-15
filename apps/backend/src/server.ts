import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { config } from "./config.js";
import { dbPlugin } from "./plugins/db.js";
import { errorHandlerPlugin } from "./plugins/errorHandler.js";

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

  // Register each resource here: await app.register(<resource>Routes, { prefix: "/<resource>" });

  return app;
};
