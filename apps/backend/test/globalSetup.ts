import { spawnSync } from "node:child_process";

// Brings the test database up to the committed migrations before any test runs.
export default function setup(): void {
  const testDatabaseUrl = process.env["DATABASE_URL_TEST"];
  if (!testDatabaseUrl) {
    throw new Error("DATABASE_URL_TEST is not set.");
  }
  const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Could not prepare the test database. Is it running (docker compose up -d)?\n${result.stderr}`);
  }
}
