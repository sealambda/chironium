import { useCurrentUser } from "@/shared/session/use-current-user";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/utils";

import { useDetailMode } from "./detail-context";
import { MobileSideNav } from "./side-nav";

interface TopNavProps {
  readonly onCreateOrgClick: () => void;
  readonly onJoinOrgClick: () => void;
}

/**
 * Top navigation bar matching the Stitch "Clients List" layout.
 */
export function TopNav({ onCreateOrgClick, onJoinOrgClick }: TopNavProps) {
  const { isLoading } = useCurrentUser();
  const { isDetailMode, headerContent } = useDetailMode();

  const headerClasses = cn(
    "fixed top-0 right-0 left-0 z-50",
    !isDetailMode && "sm:left-18 md:left-64",
    "border-b border-border/40 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80",
    "pt-safe",
  );

  if (isLoading) {
    return (
      <header className={headerClasses}>
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <div className="sm:hidden">
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="h-9 w-72 rounded-md" />
          </div>
        </div>
      </header>
    );
  }

  if (isDetailMode) {
    return (
      <header className={headerClasses}>
        <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
          {headerContent}
        </div>
      </header>
    );
  }

  return (
    <header className={headerClasses}>
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="sm:hidden">
          <MobileSideNav onCreateOrgClick={onCreateOrgClick} onJoinOrgClick={onJoinOrgClick} />
        </div>
        <div className="min-w-0 flex-1">{headerContent}</div>
      </div>
    </header>
  );
}
