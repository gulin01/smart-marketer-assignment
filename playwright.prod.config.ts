import dotenv from "dotenv";

// Production credentials live only in this gitignored file.
dotenv.config({ path: ".env.production.local" });
dotenv.config();
import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the LIVE deployment.
 *
 * Unlike playwright.config.ts this starts no server and resets no database — it
 * exercises whatever is currently deployed. Run with: npm run test:prod
 */
export default defineConfig({
  testDir: "./tests/prod",
  fullyParallel: false,
  workers: 1,
  retries: 1, // tolerate one cold start on Neon's free tier
  reporter: [["list"]],
  timeout: 90_000,
  use: {
    baseURL: process.env.PROD_ADMIN_HOST ?? "https://glowup-admin-app.vercel.app",
    trace: "retain-on-failure",
    ignoreHTTPSErrors: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
