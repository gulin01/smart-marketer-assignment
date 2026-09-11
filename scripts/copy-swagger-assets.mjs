import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Copies Swagger UI's assets into public/ so /api-docs works offline — no CDN,
 * which also keeps the page consistent with the app's own CSP posture.
 */
const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve("swagger-ui-dist/swagger-ui.css"));
const target = path.join(process.cwd(), "public", "swagger");

const ASSETS = [
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
];

await mkdir(target, { recursive: true });
await Promise.all(
  ASSETS.map((asset) => copyFile(path.join(dist, asset), path.join(target, asset))),
);

console.log(`Copied ${ASSETS.length} Swagger UI assets to public/swagger/`);
