import { z } from "zod";
import { prisma } from "@/lib/db";
import { withOperator } from "@/lib/session";
import { apiError, apiOk } from "@/lib/http";
import { MAX_TEMPLATE_BYTES, TemplateValidationError, parseTemplate } from "@/lib/template";

const jsonSchema = z.object({
  name: z.string().min(1).max(200),
  html: z.string().min(1),
});

export const GET = withOperator(async () => {
  const templates = await prisma.htmlTemplate.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fieldNames: true,
      createdAt: true,
      _count: { select: { forms: true } },
    },
  });
  return apiOk({
    templates: templates.map(({ _count, ...t }) => ({ ...t, formCount: _count.forms })),
  });
});

export const POST = withOperator(async (_operator, request: Request) => {
  const contentType = request.headers.get("content-type") ?? "";
  let name: string;
  let html: string;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("VALIDATION_ERROR", "업로드할 파일을 선택해 주세요");
    }
    if (!/\.html?$/i.test(file.name)) {
      return apiError("VALIDATION_ERROR", "HTML 파일(.html)만 업로드할 수 있습니다");
    }
    if (file.size > MAX_TEMPLATE_BYTES) {
      return apiError("VALIDATION_ERROR", "템플릿 크기가 200 KB를 초과합니다");
    }
    html = await file.text();
    name = String(form.get("name") ?? "").trim() || file.name;
  } else {
    const parsed = jsonSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "요청 형식이 올바르지 않습니다", parsed.error.issues);
    }
    ({ name, html } = parsed.data);
  }

  let fieldNames: string[];
  try {
    ({ fieldNames } = parseTemplate(html));
  } catch (error) {
    if (error instanceof TemplateValidationError) {
      return apiError("VALIDATION_ERROR", error.message);
    }
    throw error;
  }

  const template = await prisma.htmlTemplate.create({
    data: { name, html, fieldNames },
    select: { id: true, name: true, fieldNames: true, createdAt: true },
  });

  return apiOk(template, 201);
});
