import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { config } from "./config.js";
import { authPlugin } from "./plugins/auth.js";
import { dbPlugin } from "./plugins/db.js";
import { errorHandlerPlugin } from "./plugins/errorHandler.js";
import { attendanceRoutes } from "./routes/attendance.js";
import { auditEventRoutes } from "./routes/auditEvents.js";
import { authRoutes } from "./routes/auth.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { enrollmentRequestRoutes } from "./routes/enrollmentRequests.js";
import { groupRoutes } from "./routes/groups.js";
import { guardianRoutes } from "./routes/guardians.js";
import { memberRoutes } from "./routes/members.js";
import { meRoutes } from "./routes/me.js";
import { subscriptionRoutes } from "./routes/subscriptions.js";

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
  await app.register(authPlugin);

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(meRoutes, { prefix: "/me" });
  await app.register(guardianRoutes, { prefix: "/guardians" });
  await app.register(memberRoutes, { prefix: "/members" });
  await app.register(groupRoutes, { prefix: "/groups" });
  await app.register(attendanceRoutes, { prefix: "/groups" });
  await app.register(subscriptionRoutes, { prefix: "/subscriptions" });
  await app.register(dashboardRoutes, { prefix: "/dashboard" });
  await app.register(auditEventRoutes, { prefix: "/audit-events" });
  await app.register(enrollmentRequestRoutes, { prefix: "/enrollment-requests" });

  return app;
};
