import type { PathologyRecord } from "@/mocks/types";
import { Badge } from "@/shared/ui/badge";
import { MetricCard } from "@/shared/ui/metric-card";

const statusConfig = {
  active: { variant: "destructive" as const },
  managed: { variant: "outline" as const },
  resolved: { variant: "secondary" as const },
};

interface PathologiesCardProps {
  pathologies: PathologyRecord[];
  activeCount: number;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Card displaying pathologies summary with status badges.
 */
export function PathologiesCard({
  pathologies,
  activeCount,
  onClick,
  isLoading,
}: Readonly<PathologiesCardProps>) {
  if (isLoading) {
    return (
      <MetricCard title="Pathologies" onClick={onClick}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-24 rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-5 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </MetricCard>
    );
  }

  if (pathologies.length === 0) {
    return (
      <MetricCard title="Pathologies" onClick={onClick}>
        <p className="text-muted-foreground text-sm">No pathologies recorded</p>
      </MetricCard>
    );
  }

  // Show up to 3 pathologies
  const displayedPathologies = pathologies.slice(0, 3);
  const remainingCount = pathologies.length - 3;

  return (
    <MetricCard title="Pathologies" onClick={onClick}>
      <div className="space-y-3">
        {/* Active count summary */}
        <div className="text-sm">
          <span className="font-medium text-foreground">{activeCount}</span>
          <span className="ml-1 text-muted-foreground">
            active of {pathologies.length} total
          </span>
        </div>

        {/* Pathology list */}
        <div className="space-y-2">
          {displayedPathologies.map((pathology) => (
            <div
              key={pathology.id}
              className="flex items-center justify-between gap-2"
            >
              <span className="min-w-0 truncate text-sm text-foreground">
                {pathology.pathologyName}
              </span>
              <Badge
                variant={statusConfig[pathology.status].variant}
                className="shrink-0 capitalize"
              >
                {pathology.status}
              </Badge>
            </div>
          ))}
        </div>

        {/* "+N more" indicator */}
        {remainingCount > 0 && (
          <p className="text-muted-foreground text-xs">
            +{remainingCount} more
          </p>
        )}
      </div>
    </MetricCard>
  );
}
