import type { Locale } from "date-fns";
import { enUS, es } from "date-fns/locale";

import { getLocale } from "@/paraglide/runtime";

const locales: Record<string, Locale> = { en: enUS, es };

export const getDateLocale = () => locales[getLocale()] ?? enUS;
