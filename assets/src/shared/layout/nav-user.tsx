import { ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react";

import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { useTheme } from "@/shared/theme/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { LanguageToggle } from "@/shared/ui/language-toggle";
import { Switch } from "@/shared/ui/switch";
import { getUserInitials } from "@/shared/utils/name-utils";
import { AUTH_URLS } from "@/shared/utils/url-utils";
import { cn } from "@/shared/utils/utils";

interface NavUserProps {
  /** Show labels even on compact (tablet) viewports. */
  showLabelsOnMobile?: boolean;
  /** Called after an action that should close the mobile sheet. */
  onAction?: () => void;
}

/**
 * User menu at the bottom of the sidebar.
 * Provides language switching, theme brightness toggle, and sign-out.
 */
export function NavUser({ showLabelsOnMobile = false, onAction }: NavUserProps) {
  const { user } = useCurrentUser();
  const { theme, setTheme } = useTheme();

  const initials = getUserInitials(user?.name, user?.email);
  const displayName = user?.name || m.nav_profile();
  const displayEmail = user?.email || "-";

  const isDark = theme === "dark" || (theme === "system" && prefersDark());

  const handleSignOut = () => {
    onAction?.();
    globalThis.location.href = AUTH_URLS.signOut;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg px-2 py-2",
              !showLabelsOnMobile && "justify-center md:justify-start",
              "text-left transition-colors focus-visible:outline-none",
              "cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/50",
            )}
          />
        }
      >
        <Avatar className="size-8 border border-border/60">
          <AvatarImage
            src={user?.picture ?? undefined}
            alt={displayName}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "grid min-w-0 flex-1 text-left text-sm leading-tight",
            !showLabelsOnMobile && "hidden md:grid",
          )}
        >
          <span className="truncate font-semibold">{displayName}</span>
          <span className="truncate text-muted-foreground text-xs">{displayEmail}</span>
        </div>
        <ChevronsUpDown
          className={cn(
            "ml-auto size-4 shrink-0 opacity-50",
            !showLabelsOnMobile && "hidden md:block",
          )}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" sideOffset={4} className="w-64 rounded-lg">
        <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
          <Avatar className="size-8 border border-border/60">
            <AvatarImage
              src={user?.picture ?? undefined}
              alt={displayName}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{displayName}</span>
            <span className="truncate text-muted-foreground text-xs">{displayEmail}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <LanguageToggle variant="ghost" className="w-full" />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            closeOnClick={false}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            <span className="flex-1">{m.nav_dark_mode()}</span>
            <Switch size="sm" checked={isDark} tabIndex={-1} aria-hidden="true" />
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="size-4" />
          {m.nav_sign_out()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function prefersDark(): boolean {
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}
