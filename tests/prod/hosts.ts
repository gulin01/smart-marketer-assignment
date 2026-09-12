/** Deployment under test. Override via env to point the suite at another environment. */
export const ADMIN_HOST = process.env.PROD_ADMIN_HOST ?? "https://glowup-admin-app.vercel.app";
export const FORM_HOST = process.env.PROD_FORM_HOST ?? "https://glowup-forms.vercel.app";
export const LEGACY_HOST =
  process.env.PROD_LEGACY_HOST ?? "https://smart-marketer-assignment.vercel.app";

export const ADMIN_EMAIL = process.env.PROD_ADMIN_EMAIL ?? "admin@example.com";

/**
 * No default: this suite signs in to the deployed site, so a fallback here would
 * publish the production password. Set it in .env.production.local (gitignored)
 * or in CI secrets.
 */
export const ADMIN_PASSWORD = (() => {
  const value = process.env.PROD_ADMIN_PASSWORD;
  if (!value) {
    throw new Error(
      "PROD_ADMIN_PASSWORD must be set to run the production smoke suite " +
        "(see .env.production.local)",
    );
  }
  return value;
})();

/**
 * Every row this suite creates carries this prefix so `npm run clean:prod` can
 * remove it without touching the demo data a reviewer is looking at.
 */
export const SMOKE = "[smoke]";
