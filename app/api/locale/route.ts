import { NextResponse } from "next/server";
import { z } from "zod";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n";
import { apiError } from "@/lib/http";

const bodySchema = z.object({ locale: z.enum(LOCALES as [string, ...string[]]) });

/** Sets the operator's language. Public: it reveals nothing and gates nothing. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Unsupported locale");
  }

  const response = NextResponse.json({ locale: parsed.data.locale });
  response.cookies.set(LOCALE_COOKIE, parsed.data.locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
