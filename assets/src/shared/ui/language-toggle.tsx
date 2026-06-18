import { useCallback } from "react";

import { updatePreferredLocale } from "@/features/user/api/user-api";
import * as m from "@/paraglide/messages";
import type { Locale } from "@/paraglide/runtime";
import { useLocale } from "@/shared/i18n/locale-provider";
import { useUserStore } from "@/shared/session/user-store";
import { LocaleSelect } from "@/shared/ui/locale-select";
import { cn } from "@/shared/utils/utils";

interface LanguageToggleProps {
  className?: string;
  /** Renders without border/background to blend into dropdown menus. */
  variant?: "default" | "ghost";
  /** Applied to the selected locale label inside the trigger. */
  triggerLabelClassName?: string;
}

/**
 * Language selector dropdown with country flags and language names.
 * Persists the user's preference through `updatePreferredLocale`.
 */
export function LanguageToggle({
  className,
  variant = "default",
  triggerLabelClassName,
}: Readonly<LanguageToggleProps>) {
  const { locale: currentLocale, setLocale } = useLocale();
  const user = useUserStore((s) => s.user);

  const handleLocaleChange = useCallback(
    (newLocale: Locale | null) => {
      if (newLocale === null) {
        return;
      }

      setLocale(newLocale);

      // Fire-and-forget: persist locale preference to the backend.
      if (user?.id) {
        updatePreferredLocale(user.id, newLocale).catch((e) => {
          console.error("Failed to update preferred locale", e);
        });
      }
    },
    [setLocale, user?.id],
  );

  return (
    <LocaleSelect
      value={currentLocale}
      onChange={handleLocaleChange}
      ariaLabel={m.settings_org_language_label()}
      triggerLabelClassName={triggerLabelClassName}
      triggerClassName={cn(
        "w-full",
        variant === "ghost" &&
          "h-auto border-none bg-transparent px-2 py-1.5 shadow-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-0",
        className,
      )}
    />
  );
}
