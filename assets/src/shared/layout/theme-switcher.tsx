import { Monitor, Moon, Sun } from "lucide-react";

import * as m from "@/paraglide/messages";
import { useTheme } from "@/shared/theme/theme-provider";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

/**
 * Icon-only theme switcher with light, dark, and system options.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-2 py-1">
      <ToggleGroup
        value={theme}
        onValueChange={(value) => {
          if (value === "light" || value === "dark" || value === "system") {
            setTheme(value);
          }
        }}
        className="h-9"
      >
        <ToggleGroupItem
          value="light"
          aria-label={m.nav_theme_light()}
          title={m.nav_theme_light()}
        >
          <Sun className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dark"
          aria-label={m.nav_theme_dark()}
          title={m.nav_theme_dark()}
        >
          <Moon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="system"
          aria-label={m.nav_theme_system()}
          title={m.nav_theme_system()}
        >
          <Monitor className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
