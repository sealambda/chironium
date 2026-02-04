import { format } from "date-fns";
import type { CycleRecord } from "@/mocks/types";
import { MetricCard } from "@/shared/ui/metric-card";

interface CycleCardProps {
  cycle: CycleRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Card displaying latest menstrual cycle information.
 */
export function CycleCard({
  cycle,
  onClick,
  isLoading,
}: Readonly<CycleCardProps>) {
  if (isLoading) {
    return (
      <MetricCard title="Cycle" onClick={onClick}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      </MetricCard>
    );
  }

  if (!cycle) {
    return (
      <MetricCard title="Cycle" onClick={onClick}>
        <p className="text-muted-foreground text-sm">No cycle data recorded</p>
      </MetricCard>
    );
  }

  const startFormatted = format(new Date(cycle.startDate), "MMM d, yyyy");
  const endFormatted = cycle.endDate
    ? format(new Date(cycle.endDate), "MMM d, yyyy")
    : "Ongoing";

  const isOngoing = !cycle.endDate;

  return (
    <MetricCard
      title="Cycle"
      lastUpdated={new Date(cycle.startDate)}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Cycle dates */}
        <div className="text-sm">
          <span className="text-muted-foreground">
            {startFormatted} — {endFormatted}
          </span>
        </div>

        {/* Cycle length */}
        {cycle.cycleLength && (
          <div className="text-sm">
            <span className="font-medium text-foreground">
              {cycle.cycleLength} days
            </span>
            <span className="ml-1 text-muted-foreground">cycle length</span>
          </div>
        )}

        {isOngoing && (
          <div className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Currently ongoing
          </div>
        )}

        {/* Symptom count */}
        <div className="text-sm">
          <span className="font-medium text-foreground">
            {cycle.symptoms.length}
          </span>
          <span className="ml-1 text-muted-foreground">
            symptom{cycle.symptoms.length !== 1 ? "s" : ""} tracked
          </span>
        </div>
      </div>
    </MetricCard>
  );
}
