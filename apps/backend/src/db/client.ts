import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config.js";
import { PrismaClient } from "../generated/prisma/client.js";

export type Db = PrismaClient;

// The only PrismaClient instance. Everything else receives it as an argument.
export const prisma: Db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});
