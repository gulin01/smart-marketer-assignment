import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale, dictionaries } from "./dictionaries";
import { LOCALE_COOKIE, interpolate, isLocale } from "./index";

type ApiKey = keyof typeof dictionaries.ko.api;

/**
 * Localised copy for API error messages.
 *
 * Reading the cookie can throw outside a request scope (scripts, some test
 * harnesses), so this degrades to the default locale rather than failing the
 * request it was meant to describe.
 */
export async function apiMessage(
  key: ApiKey,
  values?: Record<string, string | number>,
): Promise<string> {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const value = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(value)) locale = value;
  } catch {
    // no request scope — default locale is correct
  }
  return interpolate(dictionaries[locale].api[key], values);
}
