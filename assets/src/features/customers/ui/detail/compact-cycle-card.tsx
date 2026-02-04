import { differenceInDays } from "date-fns";
import type { CycleRecord } from "@/mocks/types";
import { LineChartSkeleton } from "@/shared/ui/chart-skeleton";
import { StatCard, StatCardSkeleton } from "./stat-card";

/**
 * Determine cycle phase based on day of cycle.
 * Typical phases:
 * - Menstruation: Days 1-5
 * - Follicular: Days 6-13
 * - Ovulation: Days 14-16
 * - Luteal: Days 17-28
 */
function getCyclePhase(dayOfCycle: number): string {
  if (dayOfCycle <= 5) return "Menstruation";
  if (dayOfCycle <= 13) return "Follicular";
  if (dayOfCycle <= 16) return "Ovulation";
  return "Luteal";
}

interface CompactCycleCardProps {
  cycle: CycleRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Compact cycle card showing current day of cycle and phase.
 * Includes a line chart placeholder for cycle history.
 */
export function CompactCycleCard({
  cycle,
  onClick,
  isLoading,
}: Readonly<CompactCycleCardProps>) {
  if (isLoading) {
    return <StatCardSkeleton cardBgColor="bg-pink-50/50" />;
  }

  if (!cycle) {
    return (
      <StatCard
        cardBgColor="bg-pink-50/50"
        label="Cycle"
        value="--"
        subtitle="No data recorded"
        onClick={onClick}
      />
    );
  }

  // Calculate current day of cycle if ongoing
  const isOngoing = !cycle.endDate;
  let dayOfCycle: number | null = null;
  let phase: string | null = null;

  if (isOngoing) {
    const startDate = new Date(cycle.startDate);
    const now = new Date();
    dayOfCycle = differenceInDays(now, startDate) + 1;
    phase = getCyclePhase(dayOfCycle);
  }

  const value =
    dayOfCycle !== null ? `Day ${dayOfCycle}` : `${cycle.cycleLength}d`;
  const subtitle =
    phase ??
    (cycle.symptoms.length > 0
      ? `${cycle.symptoms.length} symptoms tracked`
      : "Cycle completed");

  return (
    <StatCard
      cardBgColor="bg-pink-50/50"
      label={isOngoing ? "Current Cycle" : "Last Cycle"}
      value={value}
      subtitle={subtitle}
      chartPlaceholder={<LineChartSkeleton className="w-full" />}
      onClick={onClick}
    />
  );
}
