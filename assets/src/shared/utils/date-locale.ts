import type { Locale as DateFnsLocale } from "date-fns";
import { enUS, es } from "date-fns/locale";

import { getLocale, type Locale } from "@/paraglide/runtime";

const dateFnsLocales: Record<Locale, DateFnsLocale> = { en: enUS, es };

export const getDateLocale = () => dateFnsLocales[getLocale()];
