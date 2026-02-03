import { useEffect, useRef, useState } from "react";
import { useOrg } from "@/features/org/hooks/use-org";
import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { OrgSelectorCombobox } from "@/features/org/ui/org-selector-combobox";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import type { User } from "@/gql/graphql";
import { AppName } from "@/shared/ui/app-name";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { QuickActions } from "./quick-actions";

/**
 * Get user initials from name or email.
 */
function getInitials(user: User | null): string {
  if (!user) return "?";

  let parts = [];

  if (user.name) {
    // Try to get initials from name first.
    parts = user.name.trim().split(/\s+/).filter(Boolean);
  } else {
    // Fall back to email.
    const emailPart = user.email.split("@")[0];
    parts = emailPart.split(/[._-]/).filter(Boolean);
  }

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  } else if (parts.length === 1) {
    return `${parts[0][0] || ""}`.toUpperCase();
  } else {
    return "?";
  }
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

  const initials = getInitials(user);

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
          "flex h-16 items-center",
          // M3 margins: 16px compact, 24px medium, 32px expanded.
          "px-4 md:px-6 lg:px-8",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-4 flex-1 min-w-0">
          {/* Leading section: avatar + org selector */}
          <div className="flex items-start gap-3 min-w-0">
            {/* Profile Avatar (clickable, will redirect to profile page) */}
            <button
              type="button"
              onClick={() => {
                /* TODO: Navigate to /profile when implemented */
              }}
              className={[
                // Touch target: 40px avatar within 44px minimum hit area.
                "rounded-full ring-offset-background transition-opacity",
                "hover:opacity-80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              ].join(" ")}
              aria-label="View profile"
            >
              <Avatar className="h-10 w-10 border-2 border-primary/20">
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
            </button>

            {/* Welcome text + Org selector stacked */}
            <div className="flex flex-col gap-0 min-w-0 mt-1.5">
              {/* Welcome message - bottom line aligns with avatar center */}
              <div className="text-xs leading-tight">
                <span className="text-muted-foreground">
                  Welcome back
                  {user.name && (
                    <>
                      ,{" "}
                      <span className="font-medium text-foreground truncate inline-block max-w-[200px] align-bottom">
                        {user.name}
                      </span>
                    </>
                  )}
                </span>
              </div>

              {/* Organization selector */}
              <OrgSelectorCombobox
                selectedOrg={selectedOrg}
                availableOrgs={availableOrgs}
                onSelectOrg={selectOrg}
                onCreateClick={() => setIsCreateOrgOpen(true)}
              />
            </div>
          </div>

          {/* Trailing section: context-relevant quick-actions */}
          <div className="flex items-center gap-2 shrink-0">
            <QuickActions />
          </div>
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
