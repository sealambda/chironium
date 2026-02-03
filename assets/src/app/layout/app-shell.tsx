import { BottomNav } from "@/shared/layout/bottom-nav";
import { SideNav } from "@/shared/layout/side-nav";
import { TopNav } from "./top-nav";

interface AppShellProps {
  readonly children: React.ReactNode;
}

/**
 * Main application shell providing responsive layout structure.
 * Follows Apple HIG and Material Design 3 guidelines:
 * - Mobile (compact): Bottom navigation + fixed top header.
 * - Tablet (medium): Side navigation rail + top header.
 * - Desktop (expanded+): Side navigation drawer + top header.
 *
 * Window Size Classes (M3):
 * - Compact: <600px (bottom nav).
 * - Medium: 600-839px (collapsed side nav).
 * - Expanded: 840-1199px (expanded side nav).
 * - Large: 1200-1599px.
 * - Extra-large: ≥1600px.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-svh w-full max-w-full overflow-x-hidden bg-background">
      {/* Side Navigation - Hidden on mobile (compact), visible on tablet+ (medium+). */}
      <SideNav />

      {/* Main content wrapper. */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-18 lg:pl-64">
        {/* Top Navigation - Fixed at top. */}
        <TopNav />

        {/* Main content area with safe padding for fixed nav and safe areas. */}
        <main
          className={[
            "min-w-0 flex-1 overflow-y-auto overflow-x-hidden",
            // Top padding for fixed header: 64px (h-16) per M3 small app bar.
            "pt-16",
            // Mobile: padding for fixed bottom nav.
            // Formula: nav height (64px) + breathing room (16px) + safe area.
            // Per M3/HIG: content needs margin from nav bar edge for visual separation.
            "pb-[calc(64px+16px+env(safe-area-inset-bottom))]",
            // Tablet+: standard bottom padding (no fixed bottom nav).
            "md:pb-8",
            // Horizontal padding following M3 margins: 16px compact, 24px medium, 32px expanded.
            "px-4 md:px-6 lg:px-8",
          ].join(" ")}
        >
          {/* Container with max-width for large screens (prevents text line >60 chars). */}
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        {/* Bottom Navigation - Visible on mobile only. */}
        <BottomNav />
      </div>
    </div>
  );
}
