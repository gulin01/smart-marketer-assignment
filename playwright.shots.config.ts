import baseConfig from "./playwright.config";

/**
 * Screenshot capture for design review. Kept out of the default E2E run — it
 * writes image files and seeds sample traffic, which a test suite should not.
 *
 *   SHOT_DIR=/tmp/shots npm run shots
 */
export default {
  ...baseConfig,
  testDir: "./tests/screenshots",
  use: {
    ...baseConfig.use,
    // Dark mode is a selected design, not an automatic inversion — it gets
    // looked at, so SHOT_SCHEME=dark captures it.
    colorScheme: (process.env.SHOT_SCHEME === "dark" ? "dark" : "light") as "dark" | "light",
  },
};
