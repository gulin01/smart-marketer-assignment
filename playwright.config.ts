// Must load before the config body reads DATABASE_URL_TEST, otherwise the web
// server starts with an empty DATABASE_URL and every request 500s.
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * The E2E suite runs against the dev server on its own port and its own
 * database (DATABASE_URL_TEST), so it never disturbs local development data.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: (() => {
        const url = process.env.DATABASE_URL_TEST;
        if (!url) throw new Error("DATABASE_URL_TEST must be set to run the E2E suite");
        return url;
      })(),
      APP_HOST: baseURL,
      FORM_HOST: baseURL,
    },
  },
});
