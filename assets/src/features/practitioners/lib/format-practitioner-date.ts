import { format, parseISO } from "date-fns";

import { getDateLocale } from "@/shared/utils/date-locale";

/** Formats a GraphQL Date (YYYY-MM-DD) for display, or returns an em dash when missing. */
export function formatPractitionerBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) {
    return "—";
  }
  try {
    return format(parseISO(birthDate), "PP", { locale: getDateLocale() });
  } catch {
    return "—";
  }
}
