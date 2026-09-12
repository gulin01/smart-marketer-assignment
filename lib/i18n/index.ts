import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  type Dictionary,
  type Locale,
  LOCALES,
  dictionaries,
} from "./dictionaries";

export { DEFAULT_LOCALE, LOCALES };
export type { Dictionary, Locale };

export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as string[]).includes(value);
}

/**
 * The operator's language, from a cookie rather than a URL segment.
 *
 * A `/ko/...` path prefix would rewrite every route, every test and every link
 * already handed out — a large blast radius for a preference that belongs to one
 * signed-in operator (ADR 0010).
 */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] as Dictionary;
}

export async function getTranslations(): Promise<{ t: Dictionary; locale: Locale }> {
  const locale = await getLocale();
  return { t: getDictionary(locale), locale };
}

/** Fills `{name}` placeholders. Missing keys are left visible rather than blanked. */
export function interpolate(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
