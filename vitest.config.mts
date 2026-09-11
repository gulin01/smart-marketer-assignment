
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/env.ts"],
    globalSetup: ["tests/setup/migrate.ts"],
    // API tests share one Postgres database; running files in parallel would
    // let one suite's truncate wipe another's fixtures mid-test.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
