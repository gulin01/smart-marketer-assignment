import { z } from "zod";

/**
 * Validated server-side environment. Importing this module from client code is
 * a build error by design — every consumer is a server component, route handler
 * or script.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_TEST: z.string().min(1).optional(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
  APP_HOST: z.url(),
  FORM_HOST: z.url(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;

/** True when the public form is served from a different origin than the admin. */
export const originsAreIsolated = env.APP_HOST !== env.FORM_HOST;
