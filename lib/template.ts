import * as cheerio from "cheerio";

export const MAX_TEMPLATE_BYTES = 200 * 1024; // 200 KB

export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateValidationError";
  }
}

/**
 * The template contract (ADR 0007): the uploaded HTML must contain exactly one
 * `<form>` with at least one named field. We do not sanitize the HTML — it is
 * neutralised at render time by origin isolation + sandbox + CSP (ADR 0003).
 */
export function parseTemplate(html: string): { fieldNames: string[] } {
  if (Buffer.byteLength(html, "utf8") > MAX_TEMPLATE_BYTES) {
    throw new TemplateValidationError("템플릿 크기가 200 KB를 초과합니다");
  }

  const $ = cheerio.load(html);
  const forms = $("form");

  if (forms.length === 0) {
    throw new TemplateValidationError("템플릿에 <form> 요소가 없습니다");
  }
  if (forms.length > 1) {
    throw new TemplateValidationError(
      `템플릿에는 <form> 요소가 정확히 1개 있어야 합니다 (현재 ${forms.length}개)`,
    );
  }

  const fieldNames = new Set<string>();
  forms
    .first()
    .find("input, select, textarea")
    .each((_, element) => {
      const name = $(element).attr("name")?.trim();
      const type = $(element).attr("type")?.toLowerCase();
      // Submit/button/reset controls are not answers.
      if (!name || type === "submit" || type === "button" || type === "reset") return;
      // Reserved for platform-injected metadata.
      if (name.startsWith("__")) return;
      fieldNames.add(name);
    });

  if (fieldNames.size === 0) {
    throw new TemplateValidationError(
      "템플릿의 <form> 안에 name 속성이 있는 입력 필드가 최소 1개 필요합니다",
    );
  }

  return { fieldNames: [...fieldNames] };
}

/** Heuristic mapping from template field names to the CRM columns (ADR 0005). */
const CRM_PATTERNS = {
  name: /^(name|full[_-]?name|fullname|username|이름|성함)$/i,
  phone: /^(phone|tel|telephone|mobile|phone[_-]?number|연락처|전화번호|휴대폰)$/i,
  email: /^(e[-_]?mail|email[_-]?address|이메일)$/i,
} as const;

export function extractCrmFields(data: Record<string, string>) {
  const result: { name?: string; phone?: string; email?: string } = {};
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    for (const [column, pattern] of Object.entries(CRM_PATTERNS)) {
      if (pattern.test(key) && !result[column as keyof typeof result]) {
        result[column as keyof typeof result] = value;
      }
    }
  }
  return result;
}
