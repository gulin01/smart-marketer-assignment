import { z } from "zod";
import type { DateRange } from "./stats";

const schema = z.object({
  from: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  to: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
});

export type DateRangeResult =
  | { ok: true; range: DateRange | undefined }
  | { ok: false; issues: z.core.$ZodIssue[] };

/** Parses the optional `?from=&to=` filter shared by every stats endpoint. */
export function parseDateRange(params: URLSearchParams): DateRangeResult {
  const parsed = schema.safeParse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });

  if (!parsed.success) return { ok: false, issues: parsed.error.issues };
  if (!parsed.data.from && !parsed.data.to) return { ok: true, range: undefined };

  return {
    ok: true,
    range: {
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      // A bare date means "through the end of that day".
      to: parsed.data.to
        ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.to) ? `${parsed.data.to}T23:59:59.999Z` : parsed.data.to)
        : undefined,
    },
  };
}
