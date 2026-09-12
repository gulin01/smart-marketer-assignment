import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseChannel } from "@/lib/channels";
import { injectFormRuntime } from "@/lib/inject";
import { env } from "@/lib/env";
import { VISITOR_COOKIE } from "@/proxy";

/**
 * Serves the operator's raw HTML for the sandboxed iframe.
 *
 * No session cookie is ever read here, and the CSP forbids the template from
 * loading scripts from elsewhere or posting a form anywhere (ADR 0003). The only
 * network call it can make is the fetch in our injected handler.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const form = await prisma.form.findUnique({
    where: { slug },
    select: { isActive: true, template: { select: { html: true } } },
  });

  if (!form) {
    return new Response("페이지를 찾을 수 없습니다", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (!form.isActive) {
    return new Response("이 폼은 더 이상 응답을 받지 않습니다", {
      status: 410,
      headers: { "content-type": "text/plain" },
    });
  }

  const channel = parseChannel(new URL(request.url).searchParams.get("ch"));
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;

  const endpoint = `${env.FORM_HOST.replace(/\/$/, "")}/api/public/forms/${encodeURIComponent(slug)}/submissions`;
  const html = injectFormRuntime(form.template.html, { endpoint, channel, visitorId });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": [
        "default-src 'self'",
        "script-src 'unsafe-inline'",
        "style-src 'unsafe-inline' https://fonts.googleapis.com",
        "img-src data: https:",
        "font-src data: https://fonts.gstatic.com",
        // The injected handler posts here; nothing else is reachable.
        `connect-src ${env.FORM_HOST}`,
        "form-action 'none'",
        // APP_HOST === FORM_HOST in dev; dedupe so the directive stays readable.
        `frame-ancestors ${[...new Set([env.FORM_HOST, env.APP_HOST])].join(" ")}`,
      ].join("; "),
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
