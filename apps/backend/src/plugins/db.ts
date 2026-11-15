import fp from "fastify-plugin";
import { prisma, type Db } from "../db/client.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

export const dbPlugin = fp(async (app) => {
  app.decorate("db", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
