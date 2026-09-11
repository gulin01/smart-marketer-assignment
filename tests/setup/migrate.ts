import "dotenv/config";
import { execFileSync } from "node:child_process";

/**
 * Global setup: applies migrations to the test database once per run, so
 * `npm test` works on a clean checkout without a manual migrate step.
 */
export default function setup() {
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error("DATABASE_URL_TEST must be set to run the test suite (see .env.example)");
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
}
