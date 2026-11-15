import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// The Prisma CLI does not load .env on its own. Variables already set in the
// environment win, which is how the test run points it at the test database.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
