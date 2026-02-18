import { LogOut } from "lucide-react";
import { useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { OrgSelector } from "@/features/org/ui/org-selector";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import type { User } from "@/gql/graphql";
import * as m from "@/paraglide/messages";
import { AppName } from "@/shared/ui/app-name";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { LanguageToggle } from "@/shared/ui/language-toggle";
import { getInitials, getInitialsFromEmail } from "@/shared/utils/name-utils";
import { AUTH_URLS } from "@/shared/utils/url-utils";
import { cn } from "@/shared/utils/utils";

import { useDetailMode } from "./detail-context";

/** Get user initials from name or email. */
function getUserInitials(user: User | null): string {
  if (!user) {
    return "?";
  }
  return user.name ? getInitials(user.name) : getInitialsFromEmail(user.email);
}

/**
 * Top navigation bar with profile, welcome message, tenant selector, and notifications.
 * Follows Apple HIG and Material Design 3 small app bar specifications:
 * - Height: 64px (M3 small app bar standard).
 * - Touch targets: >= 44px per Apple HIG.
 * - Horizontal margins: 16px compact, 24px medium, 32px expanded (M3).
 *
 * Responsive behavior:
 * - Mobile: Full width, positioned at screen top.
 * - Tablet: Offset for navigation rail (72px).
 * - Desktop: Offset for navigation drawer (256px).
 *
 * In detail mode, renders custom header content instead of org selector and profile.
 */
export function TopNav() {
  const { user, isLoading } = useCurrentUser();
  const { selectedOrg, availableOrgs, selectOrg } = useOrg();
  const { isDetailMode, headerContent } = useDetailMode();
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const initials = getUserInitials(user);

  const handleLogout = () => {
    window.location.href = AUTH_URLS.signOut;
  };

  const headerClasses = cn(
    "fixed top-0 right-0 left-0 z-50",
    !isDetailMode && "md:left-18 lg:left-64",
    "border-border/40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80",
    "pt-safe",
  );

  if (isLoading || !user) {
    return (
      <header className={headerClasses}>
        <div className="flex h-16 items-center px-4 md:px-6 lg:px-8">
          <AppName className="text-primary text-xl md:hidden" />
        </div>
      </header>
    );
  }

  if (isDetailMode) {
    return (
      <header className={headerClasses}>
        <div className="flex h-16 items-center px-4 md:px-6 lg:px-8">{headerContent}</div>
      </header>
    );
  }

  const firstName = user.name?.split(/\s+/)[0] || user.email.split("@")[0];

  return (
    <header className={headerClasses}>
      <div className={cn("flex h-16 items-center justify-between", "px-4 md:px-6 lg:px-8")}>
        {/* Leading: Welcome + Org Selector */}
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            {m.nav_welcome({ name: firstName })}
          </span>
          <OrgSelector
            selectedOrg={selectedOrg}
            availableOrgs={availableOrgs}
            onSelectOrg={selectOrg}
            onCreateClick={() => setIsCreateOrgOpen(true)}
          />
        </div>

        {/* Trailing: Profile */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "rounded-full ring-offset-background transition-opacity",
                    "hover:opacity-80",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                  aria-label="Open profile menu"
                />
              }
            >
              <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/20">
                {user.picture ? (
                  <AvatarImage src={user.picture} alt={user.name || user.email} />
                ) : null}
                <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                {user.name ? <p className="font-semibold text-sm">{user.name}</p> : null}
                <p
                  className={user.name ? "text-muted-foreground text-xs" : "font-semibold text-sm"}
                >
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <LanguageToggle />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="min-h-11 cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {m.nav_sign_out()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CreateOrgModal open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen} />
    </header>
  );
}
