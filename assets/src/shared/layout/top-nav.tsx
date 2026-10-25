import { SiGithub } from "@icons-pack/react-simple-icons";

import * as m from "@/paraglide/messages";
import { useCurrentUser } from "@/shared/session/use-current-user";
import { buttonVariants } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { runtimeConfig } from "@/shared/utils/runtime-config";
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
            <Skeleton className="size-9 rounded-md" />
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
        {runtimeConfig.sourceCodeUrl ? (
          <a
            href={runtimeConfig.sourceCodeUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={m.nav_source_code()}
            title={m.nav_source_code()}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "ml-auto")}
          >
            <SiGithub size={16} aria-hidden />
          </a>
        ) : null}
      </div>
    </header>
  );
}
