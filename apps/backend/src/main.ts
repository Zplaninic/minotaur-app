import { config } from "./config.js";
import { buildServer } from "./server.js";

const app = await buildServer();

const shutdown = async (): Promise<void> => {
  await app.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error({ err: error }, "failed to start");
  process.exit(1);
}
