import type { PathologyRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils";
import { StatCardSkeleton } from "./stat-card";

interface CompactPathologiesCardProps {
  pathologies: PathologyRecord[];
  activeCount: number;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Compact pathologies card displaying active pathologies as badges.
 */
export function CompactPathologiesCard({
  pathologies,
  activeCount,
  onClick,
  isLoading,
}: Readonly<CompactPathologiesCardProps>) {
  if (isLoading) {
    return <StatCardSkeleton cardBgColor="bg-amber-50/50" />;
  }

  // Only show active pathologies
  const activePathologies = pathologies.filter((p) => p.status === "active");
  const displayedPathologies = activePathologies.slice(0, 3);
  const hasMore = activePathologies.length > 3;

  const content = (
    <div
      className={cn(
        "flex aspect-square flex-col rounded-2xl border border-border/30 bg-amber-50/50 p-4 shadow-sm md:aspect-[2/1]",
        "cursor-pointer transition-all hover:shadow-md",
      )}
    >
      {/* Pathology badges - fills available space */}
      <div className="flex min-h-0 flex-1 flex-wrap content-center items-center gap-1.5">
        {displayedPathologies.length > 0 ? (
          <>
            {displayedPathologies.map((pathology) => (
              <Badge
                key={pathology.id}
                className="h-4 px-1.5 text-[10px] bg-red-100 text-red-700 border-red-200"
              >
                {pathology.pathologyName}
              </Badge>
            ))}
            {hasMore && (
              <Badge className="h-4 px-1.5 text-[10px] bg-muted text-muted-foreground border-border">
                +{activePathologies.length - 3}
              </Badge>
            )}
          </>
        ) : (
          <span className="text-muted-foreground text-xs">
            {m.stat_no_pathologies()}
          </span>
        )}
      </div>

      {/* Bottom section: Stats summary */}
      <div className="mt-auto shrink-0 pt-2">
        <p className="text-muted-foreground text-[10px] leading-tight">
          {m.stat_pathologies()}
        </p>
        <div className="flex items-baseline gap-0.5">
          <span className="font-bold text-lg text-foreground">
            {activeCount > 0 ? activeCount : "--"}
          </span>
          {activeCount > 0 && (
            <span className="text-muted-foreground text-xs">
              {m.stat_active()}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}
