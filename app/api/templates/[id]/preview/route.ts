import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError } from "@/lib/http";
import { env } from "@/lib/env";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Serves the raw template for the admin preview iframe. The iframe is sandboxed
 * without `allow-same-origin`, and this CSP blocks the template from reaching
 * anything outside itself — the same treatment it gets in production (ADR 0003).
 */
export const GET = withOperator(async (_operator, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const template = await prisma.htmlTemplate.findUnique({
    where: { id },
    select: { html: true },
  });
  if (!template) return apiError("NOT_FOUND", "템플릿을 찾을 수 없습니다");

  return new Response(template.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": [
        "default-src 'self'",
        "script-src 'unsafe-inline' 'unsafe-eval'",
        "style-src 'unsafe-inline' https://fonts.googleapis.com",
        "img-src data: https:",
        "font-src data: https://fonts.gstatic.com",
        "connect-src 'none'",
        "form-action 'none'",
        `frame-ancestors ${env.APP_HOST}`,
      ].join("; "),
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
});
