import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/http";
import { parseChannel } from "@/lib/channels";
import { extractCrmFields } from "@/lib/template";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

type Ctx = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  channel: z.string().nullish(),
  visitorId: z.string().max(128).nullish(),
  data: z.record(z.string().min(1).max(200), z.string().max(5000)),
});

/**
 * The template iframe is sandboxed without `allow-same-origin`, so its requests
 * carry `Origin: null`. We accept that, plus our own two hosts — anything else
 * is rejected (ADR 0003).
 */
function allowedOrigin(origin: string | null): string | null {
  if (origin === null || origin === "null") return "null";
  if (origin === env.FORM_HOST || origin === env.APP_HOST) return origin;
  return null;
}

function corsHeaders(origin: string) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export async function OPTIONS(request: Request) {
  const origin = allowedOrigin(request.headers.get("origin"));
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;

  const origin = allowedOrigin(request.headers.get("origin"));
  if (!origin) {
    return apiError("FORBIDDEN", "허용되지 않은 요청 출처입니다");
  }
  const cors = corsHeaders(origin);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const limit = rateLimit(`submit:${ip}:${slug}`, { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return apiError("RATE_LIMITED", "제출 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요", undefined, {
      ...cors,
      "retry-after": String(limit.retryAfterSeconds),
    });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다", parsed.error.issues, cors);
  }

  const form = await prisma.form.findUnique({
    where: { slug },
    select: { id: true, isActive: true, template: { select: { fieldNames: true } } },
  });

  if (!form) return apiError("NOT_FOUND", "폼을 찾을 수 없습니다", undefined, cors);
  if (!form.isActive) {
    return apiError("GONE", "이 폼은 더 이상 응답을 받지 않습니다", undefined, cors);
  }

  // Only fields declared by the template are accepted — an attacker cannot use
  // the endpoint as arbitrary JSON storage.
  const allowed = new Set(form.template.fieldNames);
  const unknown = Object.keys(parsed.data.data).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    return apiError(
      "VALIDATION_ERROR",
      `템플릿에 없는 필드입니다: ${unknown.join(", ")}`,
      { allowedFields: form.template.fieldNames },
      cors,
    );
  }

  const crm = extractCrmFields(parsed.data.data);

  const submission = await prisma.submission.create({
    data: {
      formId: form.id,
      channel: parseChannel(parsed.data.channel),
      visitorId: parsed.data.visitorId ?? null,
      ...crm,
      data: parsed.data.data,
    },
    select: { id: true, createdAt: true },
  });

  return apiOk(submission, 201, cors);
}
