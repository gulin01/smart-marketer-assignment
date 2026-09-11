import { execFileSync } from "node:child_process";

/**
 * Playwright's TypeScript loader is CommonJS, but the generated Prisma 7 client
 * is ESM-only — so the database prep runs in its own tsx process.
 */
export default function globalSetup() {
  execFileSync("npx", ["tsx", "scripts/prepare-test-db.ts"], { stdio: "inherit" });
}
