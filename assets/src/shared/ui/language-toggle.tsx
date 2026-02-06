import * as Flags from "country-flag-icons/react/3x2";

import { locales } from "@/paraglide/runtime";
import { useLocale } from "@/shared/i18n/locale-provider";
import { cn } from "@/shared/utils/utils";

interface LanguageToggleProps {
  className?: string;
}

/**
 * Inline language toggle with flags for use in dropdown menus.
 * Shows both language options as a segmented control with country flags.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { locale: currentLocale, setLocale } = useLocale();

  return (
    <fieldset
      className={cn("flex w-full items-center rounded-lg bg-muted p-1", className)}
      aria-label="Select language"
    >
      {locales.map((locale) => {
        const isSelected = locale === currentLocale;
        const FlagComponent = locale === "en" ? Flags.GB : Flags.ES;
        const label = locale.toUpperCase();

        return (
          <label
            key={locale}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5",
              "font-medium text-sm transition-all",
              "has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
              isSelected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name="language"
              value={locale}
              checked={isSelected}
              onChange={() => setLocale(locale)}
              className="sr-only"
            />
            <FlagComponent className="h-4 w-6 overflow-hidden rounded-sm" aria-hidden="true" />
            <span>{label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
