import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { parseDateRange } from "@/lib/date-range";

type Ctx = { params: Promise<{ id: string }> };

/** RFC 4180 escaping, plus a guard against spreadsheet formula injection. */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const GET = withOperator(async (_operator, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const params = new URL(request.url).searchParams;

  const range = parseDateRange(params);
  if (!range.ok) return apiError("VALIDATION_ERROR", "날짜 범위가 올바르지 않습니다", range.issues);

  const form = await prisma.form.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true, template: { select: { fieldNames: true } } },
  });
  if (!form) return apiError("NOT_FOUND", "폼을 찾을 수 없습니다");

  const submissions = await prisma.submission.findMany({
    where: {
      formId: id,
      createdAt: range.range ? { gte: range.range.from, lte: range.range.to } : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  if (params.get("format") !== "csv") {
    return apiOk({ form, submissions });
  }

  // CRM columns are heuristically derived from the answers, so the raw answers
  // are emitted separately under an `answer.` prefix rather than colliding with them.
  const fields = form.template.fieldNames;
  const header = [
    "submittedAt",
    "channel",
    "name",
    "phone",
    "email",
    ...fields.map((field) => `answer.${field}`),
  ];
  const rows = submissions.map((submission) => {
    const data = (submission.data ?? {}) as Record<string, unknown>;
    return [
      submission.createdAt.toISOString(),
      submission.channel ?? "DIRECT",
      submission.name,
      submission.phone,
      submission.email,
      ...fields.map((field) => data[field]),
    ].map(csvCell).join(",");
  });

  // BOM so Excel opens Korean text as UTF-8 instead of mojibake.
  const csv = `﻿${header.map(csvCell).join(",")}\r\n${rows.join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="submissions-${form.slug}.csv"`,
      "cache-control": "no-store",
    },
  });
});
