import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const testDatabaseUrl = process.env["DATABASE_URL_TEST"];
if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is not set. Copy .env.example to .env.");
}
if (testDatabaseUrl === process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL_TEST must not point at the development database.");
}

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: testDatabaseUrl,
    },
    globalSetup: "./test/globalSetup.ts",
    // All test files share one database.
    fileParallelism: false,
  },
});
