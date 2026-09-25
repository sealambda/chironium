import { isLocale, overwriteGetLocale } from "@/paraglide/runtime";

/**
 * Speaks the organization's language, which the server renders as `<html lang>`.
 * The staff app's language cookie is left untouched.
 */
export function applyDocumentLocale(): void {
  const lang = document.documentElement.lang;
  if (isLocale(lang)) {
    overwriteGetLocale(() => lang);
  }
}
