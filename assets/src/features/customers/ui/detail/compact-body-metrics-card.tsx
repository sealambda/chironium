import { Activity, Ruler } from "lucide-react";
import type { BodyMetricsRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { LineChartSkeleton } from "@/shared/ui/chart-skeleton";
import { heightMetersToCm } from "@/shared/utils";
import { StatCard, StatCardSkeleton } from "./stat-card";

interface CompactBodyMetricsCardProps {
  metrics: BodyMetricsRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Compact body metrics card showing weight as the primary metric.
 * Includes height and BMI as subtitle, with a line chart placeholder.
 */
export function CompactBodyMetricsCard({
  metrics,
  onClick,
  isLoading,
}: Readonly<CompactBodyMetricsCardProps>) {
  if (isLoading) {
    return <StatCardSkeleton cardBgColor="bg-blue-50/50" />;
  }

  if (!metrics) {
    return (
      <StatCard
        cardBgColor="bg-blue-50/50"
        label={m.stat_body_metrics()}
        value="--"
        subtitle={m.stat_no_data()}
        onClick={onClick}
      />
    );
  }

  const heightCm = heightMetersToCm(metrics.heightM);
  const subtitle = (
    <div className="flex items-center gap-1">
      <Badge className="h-4 px-1.5 text-[10px] bg-blue-100 text-blue-700 border-blue-200">
        <Ruler className="size-2.5" />
        {heightCm}cm
      </Badge>
      <Badge className="h-4 px-1.5 text-[10px] bg-blue-100 text-blue-700 border-blue-200">
        <Activity className="size-2.5" />
        BMI {metrics.bmi.toFixed(1)}
      </Badge>
    </div>
  );

  return (
    <StatCard
      cardBgColor="bg-blue-50/50"
      label={m.stat_weight()}
      value={metrics.weight}
      unit="kg"
      subtitle={subtitle}
      chartPlaceholder={<LineChartSkeleton className="w-full" />}
      onClick={onClick}
    />
  );
}
