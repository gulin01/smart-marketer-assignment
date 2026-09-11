import { readFile } from "node:fs/promises";
import path from "node:path";

/** Serves the hand-written spec that Swagger UI at /api-docs loads. */
export async function GET() {
  const spec = await readFile(path.join(process.cwd(), "doc", "openapi.yaml"), "utf8");
  return new Response(spec, {
    headers: {
      "content-type": "application/yaml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
