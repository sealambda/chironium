import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/shared/utils";
import { navItems } from "./nav-config";

/**
 * Bottom navigation bar for mobile (compact) layouts only.
 * Follows Apple HIG tab bar and M3 flexible navigation bar specs:
 * - Height: 64px per M3 flexible nav bar (replacing deprecated 80px).
 * - Touch targets: >= 44px per Apple HIG accessibility guidelines.
 * - Floats above content with glass/blur effect (Liquid Glass pattern).
 *
 * Hidden on tablet+ (medium+) where SideNav is used instead.
 * Per M3 guidelines: navigation bar swaps to navigation rail/drawer on larger screens.
 */
export function BottomNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav
      className={cn(
        // Hidden on tablet+ where side nav is used.
        "md:hidden",
        // Fixed position at bottom.
        "fixed inset-x-0 bottom-0 z-50",
        // Styling - glass effect per Apple Liquid Glass / M3 surface container.
        "border-border/40 border-t bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80",
      )}
      aria-label="Main navigation"
    >
      {/* Container: 64px height per M3 flexible nav bar + safe area padding. */}
      <div
        className={cn(
          "flex items-center justify-around",
          // Height: 64px per M3 flexible navigation bar spec.
          "h-16",
          // Safe area padding for home indicator on notched devices.
          "pb-safe",
        )}
      >
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.to);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <button
                key={item.to}
                type="button"
                disabled
                className={cn(
                  // Touch target: minimum 44x44px.
                  "flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 px-3 py-2",
                  "cursor-not-allowed opacity-40",
                )}
                aria-label={`${item.label} (disabled)`}
              >
                <Icon className="h-6 w-6 text-muted-foreground" />
                <span className="font-medium text-muted-foreground text-xs">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                // Touch target: minimum 44x44px.
                "flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-transform duration-200",
                  isActive && "scale-110",
                )}
              />
              <span
                className={cn(
                  "font-medium text-xs transition-all",
                  isActive && "font-semibold",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
