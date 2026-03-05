import * as Flags from "country-flag-icons/react/3x2";

import * as m from "@/paraglide/messages";
import { type Locale, locales } from "@/paraglide/runtime";
import { useLocale } from "@/shared/i18n/locale-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
} from "@/shared/ui/select";
import { cn } from "@/shared/utils/utils";

interface LanguageToggleProps {
  className?: string;
  /** Renders without border/background to blend into dropdown menus. */
  variant?: "default" | "ghost";
}

const LOCALE_CONFIG: Record<Locale, { Flag: React.ElementType; label: () => string }> = {
  en: { Flag: Flags.GB, label: m.nav_lang_en },
  es: { Flag: Flags.ES, label: m.nav_lang_es },
};

/**
 * Language selector dropdown with country flags and language names.
 */
export function LanguageToggle({ className, variant = "default" }: LanguageToggleProps) {
  const { locale: currentLocale, setLocale } = useLocale();
  const { Flag, label } = LOCALE_CONFIG[currentLocale];

  return (
    <Select value={currentLocale} onValueChange={(val) => setLocale(val as Locale)}>
      <SelectTrigger
        className={cn(
          "w-full",
          variant === "ghost" &&
            "h-auto border-none bg-transparent px-2 py-1.5 shadow-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-0 dark:bg-transparent dark:hover:bg-accent",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <Flag className="h-4 w-6 shrink-0 overflow-hidden rounded-sm" aria-hidden="true" />
          <span>{label()}</span>
        </span>
      </SelectTrigger>
      <SelectPositioner>
        <SelectContent>
          {locales.map((locale) => {
            const { Flag: LocaleFlag, label: localeLabel } = LOCALE_CONFIG[locale];
            return (
              <SelectItem key={locale} value={locale}>
                <span className="flex items-center gap-2">
                  <LocaleFlag
                    className="h-4 w-6 shrink-0 overflow-hidden rounded-sm"
                    aria-hidden="true"
                  />
                  {localeLabel()}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </SelectPositioner>
    </Select>
  );
}
