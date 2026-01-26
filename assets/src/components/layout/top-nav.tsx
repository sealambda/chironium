import { Bell, ChevronDown, LogOut } from "lucide-react";
import { AppName } from "@/components/ui/app-name";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/use-auth";

// Mock data for demo purposes.
const mockTenants = [
  { id: "1", name: "Comunidad MA" },
  { id: "2", name: "Gym Central" },
  { id: "3", name: "Wellness Hub" },
];

const mockNotificationCount = 3;

/**
 * Get user initials from email or name.
 */
function getInitials(
  user: {
    email: string;
    person?: { given_name: string | null; st_surname: string | null } | null;
  } | null,
): string {
  if (!user) return "?";

  // Try to get initials from person name first.
  if (user.person?.given_name) {
    const firstName = user.person.given_name;
    const lastName = user.person.st_surname || "";
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
function getDisplayName(
  user: { email: string; person?: { given_name: string | null } | null } | null,
): string {
  if (!user) return "User";
  return user.person?.given_name || user.email.split("@")[0];
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
  const { user, isAuthenticated, logout } = useAuth();
  const currentTenant = mockTenants[0];

  // Don't render nav elements if not authenticated.
  if (!isAuthenticated || !user) {
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

  const displayName = getDisplayName(user);
  const initials = getInitials(user);

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
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-col justify-center">
            <span className="text-muted-foreground text-xs">Welcome back, {displayName}!</span>

            {/* Tenant selector dropdown. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={[
                    "flex items-center gap-1",
                    "text-left font-semibold text-foreground text-sm",
                    "transition-colors hover:text-primary",
                    "focus-visible:text-primary focus-visible:outline-none",
                  ].join(" ")}
                >
                  {currentTenant.name}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {mockTenants.map((tenant) => (
                  <DropdownMenuItem key={tenant.id} className="min-h-11 cursor-pointer">
                    {tenant.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Trailing: Notifications - 44px touch target per Apple HIG. */}
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
      </div>
    </header>
  );
}
