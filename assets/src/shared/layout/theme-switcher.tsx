import { Monitor, Moon, Sun } from "lucide-react";

import * as m from "@/paraglide/messages";
import { useTheme } from "@/shared/theme/theme-provider";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { cn } from "@/shared/utils/utils";

interface ThemeSwitcherProps {
  className?: string;
  itemClassName?: string;
}

/**
 * Icon-only theme switcher with light, dark, and system options.
 */
export function ThemeSwitcher({ className, itemClassName }: Readonly<ThemeSwitcherProps>) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-full">
      <ToggleGroup
        value={theme}
        onValueChange={(value) => {
          if (value === "light" || value === "dark" || value === "system") {
            setTheme(value);
          }
        }}
        className={cn("h-9", className)}
      >
        <ToggleGroupItem
          value="light"
          aria-label={m.nav_theme_light()}
          title={m.nav_theme_light()}
          className={itemClassName}
        >
          <Sun className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dark"
          aria-label={m.nav_theme_dark()}
          title={m.nav_theme_dark()}
          className={itemClassName}
        >
          <Moon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="system"
          aria-label={m.nav_theme_system()}
          title={m.nav_theme_system()}
          className={itemClassName}
        >
          <Monitor className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
