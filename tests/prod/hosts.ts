/** Deployment under test. Override via env to point the suite at another environment. */
export const ADMIN_HOST = process.env.PROD_ADMIN_HOST ?? "https://glowup-admin-app.vercel.app";
export const FORM_HOST = process.env.PROD_FORM_HOST ?? "https://glowup-forms.vercel.app";
export const LEGACY_HOST =
  process.env.PROD_LEGACY_HOST ?? "https://smart-marketer-assignment.vercel.app";

export const ADMIN_EMAIL = process.env.PROD_ADMIN_EMAIL ?? "admin@example.com";
export const ADMIN_PASSWORD = process.env.PROD_ADMIN_PASSWORD ?? "admin1234";

/**
 * Every row this suite creates carries this prefix so `npm run clean:prod` can
 * remove it without touching the demo data a reviewer is looking at.
 */
export const SMOKE = "[smoke]";
