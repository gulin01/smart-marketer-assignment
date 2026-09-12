import * as cheerio from "cheerio";

export const MAX_TEMPLATE_BYTES = 200 * 1024; // 200 KB

/**
 * Carries a dictionary key rather than finished prose: parsing also runs outside
 * a request scope (scripts, tests), where there is no locale to resolve.
 */
export class TemplateValidationError extends Error {
  constructor(
    readonly key: "tooLarge" | "noForm" | "manyForms" | "noNamedFields",
    readonly values: Record<string, string | number> = {},
    message?: string,
  ) {
    super(message ?? key);
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
    throw new TemplateValidationError("tooLarge");
  }

  const $ = cheerio.load(html);
  const forms = $("form");

  if (forms.length === 0) {
    throw new TemplateValidationError("noForm");
  }
  if (forms.length > 1) {
    throw new TemplateValidationError("manyForms", { count: forms.length });
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
    throw new TemplateValidationError("noNamedFields");
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

export interface FieldDiff {
  added: string[];
  removed: string[];
  kept: string[];
}

/** Compares a template's declared fields before and after an edit (ADR 0009). */
export function diffFields(previous: string[], next: string[]): FieldDiff {
  const before = new Set(previous);
  const after = new Set(next);
  return {
    added: next.filter((field) => !before.has(field)),
    removed: previous.filter((field) => !after.has(field)),
    kept: previous.filter((field) => after.has(field)),
  };
}
