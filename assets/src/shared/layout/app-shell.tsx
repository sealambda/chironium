import { useState } from "react";

import { CreateOrgModal } from "@/features/org/ui/create-org-modal";
import { cn } from "@/shared/utils/utils";

import { DetailProvider, useDetailMode } from "./detail-context";
import { SideNav } from "./side-nav";
import { TopNav } from "./top-nav";

interface AppShellProps {
  readonly children: React.ReactNode;
}

/**
 * Inner shell component that consumes detail mode context.
 */
function AppShellInner({ children }: AppShellProps) {
  const { isDetailMode } = useDetailMode();
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

  return (
    <div className="flex min-h-svh w-full max-w-full overflow-x-hidden bg-background">
      {/* Side Navigation - Hidden on mobile (compact), visible on tablet+ (medium+). */}
      {/* Also hidden when in detail mode. */}
      {!isDetailMode && (
        <SideNav onCreateOrgClick={() => setIsCreateOrgOpen(true)} />
      )}

      {/* Main content wrapper. */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          // Only offset for side nav when not in detail mode.
          !isDetailMode && "sm:pl-18 md:pl-64",
        )}
      >
        {/* Top Navigation - Fixed at top. */}
        <TopNav onCreateOrgClick={() => setIsCreateOrgOpen(true)} />

        {/* Main content area with safe padding for fixed nav and safe areas. */}
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto overflow-x-hidden",
            // Top padding for fixed header: 64px (h-16) per M3 small app bar.
            "pt-16",
            "pb-6 sm:pb-8",
            // Horizontal padding following M3 margins: 16px compact, 24px medium, 32px expanded.
            "px-4 md:px-6 lg:px-8",
          )}
        >
          {/* Container with max-width for large screens (prevents text line >60 chars). */}
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <CreateOrgModal open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen} />
    </div>
  );
}

/**
 * Main application shell providing responsive layout structure.
 * Mobile uses a foldable sidebar + fixed top header.
 * Tablet and desktop use a fixed sidebar + top header.
 *
 * Supports "detail mode" where navigation elements are hidden
 * and custom header content can be rendered.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <DetailProvider>
      <AppShellInner>{children}</AppShellInner>
    </DetailProvider>
  );
}
