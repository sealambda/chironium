import * as Flags from "country-flag-icons/react/3x2";

import * as m from "@/paraglide/messages";
import { type Locale, locales } from "@/paraglide/runtime";

/** Fallback locale used when a stored value is missing or not supported. */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Presentation metadata for each supported locale (flag icon + localized label).
 * Kept as a single source of truth to avoid drift between UI surfaces.
 */
export const LOCALE_OPTIONS: Record<Locale, { flag: React.ElementType; label: () => string }> = {
  en: { flag: Flags.GB, label: m.nav_lang_en },
  es: { flag: Flags.ES, label: m.nav_lang_es },
};

/** Narrows an arbitrary string to a supported `Locale`. */
export function isSupportedLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Returns the given value when it's a supported locale, otherwise `DEFAULT_LOCALE`. */
export function toLocaleOrDefault(value: string | null | undefined): Locale {
  return value && isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
