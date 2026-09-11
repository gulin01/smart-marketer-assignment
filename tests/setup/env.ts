import "dotenv/config";

/**
 * Runs before any module that imports `lib/env`. API tests must never touch the
 * development database, so DATABASE_URL is repointed at DATABASE_URL_TEST here.
 */
if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST must be set to run the test suite (see .env.example)");
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters";
process.env.ADMIN_EMAIL ??= "admin@example.com";
process.env.ADMIN_PASSWORD ??= "admin1234";
process.env.APP_HOST ??= "http://localhost:3000";
process.env.FORM_HOST ??= "http://localhost:3000";
