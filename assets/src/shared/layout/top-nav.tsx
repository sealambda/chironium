import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOrg } from "@/features/org/hooks/use-org";
import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { OrgSelector } from "@/features/org/ui/org-selector";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import type { User } from "@/gql/graphql";
import { AppName } from "@/shared/ui/app-name";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn, getInitials, getInitialsFromEmail } from "@/shared/utils";
import { AUTH_URLS } from "@/shared/utils/url-utils";
import { useDetailMode } from "./detail-context";

/** Get user initials from name or email. */
function getUserInitials(user: User | null): string {
  if (!user) return "?";
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
  const { selectedOrg, availableOrgs, selectOrg, createOrg } = useOrg();
  const { isDetailMode, headerContent } = useDetailMode();
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount.
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        globalThis.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const initials = getUserInitials(user);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      globalThis.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = globalThis.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  const handleCreateOrg = async (data: { name: string; slug: string }) => {
    setCreateOrgError(null);
    try {
      const newOrg = await createOrg(data);
      await selectOrg(newOrg.id);
      showToast("Organisation created.");
    } catch (error) {
      console.error("Failed to create organisation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create organisation. Please try again.";
      setCreateOrgError(errorMessage);
      throw error;
    }
  };

  const handleLogout = () => {
    window.location.href = AUTH_URLS.signOut;
  };

  // Header classes - different positioning based on detail mode.
  const headerClasses = cn(
    // Fixed positioning.
    "fixed top-0 right-0 left-0 z-50",
    // Responsive left offset for side nav (only when not in detail mode).
    !isDetailMode && "md:left-18 lg:left-64",
    // Styling - subtle border, glass effect.
    "border-border/40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80",
    // Safe area insets for notched devices.
    "pt-safe",
  );

  // Show minimal header while loading or if no user data yet.
  if (isLoading || !user) {
    return (
      <header className={headerClasses}>
        <div className="flex h-16 items-center px-4 md:px-6 lg:px-8">
          <AppName className="text-primary text-xl md:hidden" />
        </div>
      </header>
    );
  }

  // In detail mode, render custom header content.
  if (isDetailMode) {
    return (
      <header className={headerClasses}>
        <div className="flex h-16 items-center px-4 md:px-6 lg:px-8">
          {headerContent}
        </div>
      </header>
    );
  }

  // Get user's first name for welcome message.
  const firstName = user.name?.split(/\s+/)[0] || user.email.split("@")[0];

  // Default: show org selector and profile.
  return (
    <header className={headerClasses}>
      {/* Container: 64px height per M3 small app bar spec. */}
      <div
        className={cn(
          "flex h-16 items-center justify-between",
          // M3 margins: 16px compact, 24px medium, 32px expanded.
          "px-4 md:px-6 lg:px-8",
        )}
      >
        {/* Leading: Welcome + Org Selector */}
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            Welcome back, {firstName}
          </span>
          <OrgSelector
            selectedOrg={selectedOrg}
            availableOrgs={availableOrgs}
            onSelectOrg={selectOrg}
            onCreateClick={() => setIsCreateOrgOpen(true)}
          />
        </div>

        {/* Trailing: Profile (user actions on right per all design systems) */}
        <div className="flex items-center">
          {/* Profile avatar with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    // Touch target: 40px avatar within 44px minimum hit area.
                    "rounded-full ring-offset-background transition-opacity",
                    "hover:opacity-80",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                  aria-label="Open profile menu"
                />
              }
            >
              <Avatar className="h-10 w-10 border-2 border-primary/20 cursor-pointer">
                {user.picture && (
                  <AvatarImage
                    src={user.picture}
                    alt={user.name || user.email}
                  />
                )}
                <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                {user.name && (
                  <p className="font-semibold text-sm">{user.name}</p>
                )}
                <p
                  className={
                    user.name
                      ? "text-muted-foreground text-xs"
                      : "font-semibold text-sm"
                  }
                >
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="min-h-11 cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CreateOrgModal
        open={isCreateOrgOpen}
        onOpenChange={setIsCreateOrgOpen}
        onSubmit={handleCreateOrg}
        error={createOrgError}
      />
      {toastMessage && (
        <div className="pointer-events-none fixed top-20 right-4 z-50 w-[260px] rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-700 text-sm shadow-lg">
          {toastMessage}
        </div>
      )}
    </header>
  );
}
