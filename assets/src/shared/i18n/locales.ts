import * as Flags from "country-flag-icons/react/3x2";
import type { ElementType } from "react";

import * as m from "@/paraglide/messages";
import { baseLocale, isLocale, type Locale } from "@/paraglide/runtime";

const DEFAULT_LOCALE: Locale = baseLocale;

export const LOCALE_OPTIONS: Record<Locale, { flag: ElementType; label: () => string }> = {
  en: { flag: Flags.GB, label: m.nav_lang_en },
  es: { flag: Flags.ES, label: m.nav_lang_es },
};

export function toLocaleOrDefault(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
