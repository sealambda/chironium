import { ChevronsUpDown, Code, LogOut } from "lucide-react";

import * as m from "@/paraglide/messages";
import { useCurrentUser } from "@/shared/session/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { getUserInitials } from "@/shared/utils/name-utils";
import { submitForm } from "@/shared/utils/request-utils";
import { runtimeConfig } from "@/shared/utils/runtime-config";
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
 * Keeps account actions separate from visible sidebar preferences.
 */
export function NavUser({ showLabelsOnMobile = false, onAction }: Readonly<NavUserProps>) {
  const { user } = useCurrentUser();

  const initials = getUserInitials(user?.name, user?.email);
  const displayName = user?.name || m.nav_profile();
  const displayEmail = user?.email || "-";

  const handleSignOut = () => {
    onAction?.();
    submitForm(AUTH_URLS.signOut, "delete");
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
              "text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden",
              "hover:bg-accent/50 focus-visible:bg-accent/50",
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
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
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
          <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
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
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {runtimeConfig.sourceCodeUrl ? (
          <DropdownMenuItem
            render={<a href={runtimeConfig.sourceCodeUrl} target="_blank" rel="noreferrer" />}
          >
            <Code aria-hidden />
            {m.nav_source_code()}
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut aria-hidden />
          {m.nav_sign_out()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
