import { useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CustomerSheet } from "@/features/customers/ui/create-customer-sheet";
import { useOrg } from "@/features/org/hooks/use-org";
import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { OrgSelector } from "@/features/org/ui/org-selector";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import type { User } from "@/gql/graphql";
import { AppName } from "@/shared/ui/app-name";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { AUTH_URLS } from "@/shared/utils/url-utils";

const mockNotificationCount = 3;

/**
 * Get user initials from email or name.
 */
function getInitials(user: User | null): string {
  if (!user) return "?";

  // Try to get initials from person name first.
  if (user.person?.givenName) {
    const firstName = user.person.givenName;
    const lastName = user.person.stSurname || "";
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  }

  // Fall back to email.
  const emailPart = user.email.split("@")[0];
  if (emailPart.includes(".")) {
    const parts = emailPart.split(".");
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return emailPart.slice(0, 2).toUpperCase();
}

/**
 * Get display name from user.
 */
function getDisplayName(user: User | null): string {
  if (!user) return "User";
  return user.person?.givenName || user.email.split("@")[0];
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
 */
export function TopNav() {
  const { user, isLoading } = useCurrentUser();
  const { selectedOrg, availableOrgs, selectOrg, createOrg } = useOrg();
  const routerState = useRouterState();
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Detect if we're on the customers page to show Add Customer icon.
  const isCustomersPage =
    routerState.location.pathname.startsWith("/customers");

  // Cleanup timeout on unmount.
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const displayName = getDisplayName(user);
  const initials = getInitials(user);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
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

  // Show minimal header while loading or if no user data yet.
  if (isLoading || !user) {
    return (
      <header
        className={[
          // Fixed positioning with responsive left offset for side nav.
          "fixed top-0 right-0 left-0 z-50",
          "md:left-18 lg:left-64",
          // Styling - subtle border, glass effect.
          "border-border/40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80",
          // Safe area insets for notched devices.
          "pt-safe",
        ].join(" ")}
      >
        <div className="flex h-16 items-center px-4 md:px-6 lg:px-8">
          <AppName className="text-primary text-xl md:hidden" />
        </div>
      </header>
    );
  }

  return (
    <header
      className={[
        // Fixed positioning with responsive left offset for side nav.
        "fixed top-0 right-0 left-0 z-50",
        "md:left-18 lg:left-64",
        // Styling - subtle border, glass effect.
        "border-border/40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80",
        // Safe area insets for notched devices.
        "pt-safe",
      ].join(" ")}
    >
      {/* Container: 64px height per M3 small app bar spec. */}
      <div
        className={[
          "flex h-16 items-center justify-between",
          // M3 margins: 16px compact, 24px medium, 32px expanded.
          "px-4 md:px-6 lg:px-8",
        ].join(" ")}
      >
        {/* Leading: Profile avatar and welcome/tenant selector. */}
        <div className="flex items-center gap-3">
          {/* Profile dropdown with logout option. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={[
                  // Touch target: 40px avatar within 44px minimum hit area.
                  "rounded-full ring-offset-background transition-opacity",
                  "hover:opacity-80",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                ].join(" ")}
                aria-label="Open profile menu"
              >
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src="" alt={displayName} />
                  <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="font-medium text-sm">{displayName}</p>
                <p className="text-muted-foreground text-xs">{user.email}</p>
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

          <div className="flex flex-col justify-center">
            <span className="text-muted-foreground text-xs">
              Welcome back, {displayName}!
            </span>
            <OrgSelector
              selectedOrg={selectedOrg}
              availableOrgs={availableOrgs}
              onSelectOrg={selectOrg}
              onCreateClick={() => setIsCreateOrgOpen(true)}
            />
          </div>
        </div>

        {/* Trailing: Add Customer on /customers, Notifications elsewhere - 44px touch target per Apple HIG. */}
        {isCustomersPage ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Add customer"
            onClick={() => setIsCreateCustomerOpen(true)}
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10"
            aria-label={`Notifications (${mockNotificationCount} unread)`}
          >
            <Bell className="h-5 w-5" />
            {mockNotificationCount > 0 && (
              <span
                className={[
                  "absolute -top-0.5 -right-0.5",
                  "flex h-4.5 w-4.5 items-center justify-center",
                  "rounded-full bg-destructive font-bold text-[10px] text-white",
                ].join(" ")}
              >
                {mockNotificationCount > 9 ? "9+" : mockNotificationCount}
              </span>
            )}
          </Button>
        )}
      </div>

      <CreateOrgModal
        open={isCreateOrgOpen}
        onOpenChange={setIsCreateOrgOpen}
        onSubmit={handleCreateOrg}
        error={createOrgError}
      />
      <CustomerSheet
        open={isCreateCustomerOpen}
        onOpenChange={setIsCreateCustomerOpen}
      />
      {toastMessage && (
        <div className="pointer-events-none fixed top-20 right-4 z-50 w-[260px] rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-700 text-sm shadow-lg">
          {toastMessage}
        </div>
      )}
    </header>
  );
}
