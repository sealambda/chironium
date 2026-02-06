import { Beef, Droplet, Wheat } from "lucide-react";

import type { NutritionPlanRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { CircularChartSkeleton } from "@/shared/ui/chart-skeleton";

import { StatCard, StatCardSkeleton } from "./stat-card";

interface CompactNutritionCardProps {
  plan: NutritionPlanRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Macro badges for protein, carbs, and fat.
 */
function MacroBadges({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  return (
    <div className="flex items-center gap-1">
      <Badge className="h-4 border-red-200 bg-red-100 px-1.5 text-[10px] text-red-700">
        <Beef className="size-2.5" />
        {protein}g
      </Badge>
      <Badge className="h-4 border-amber-200 bg-amber-100 px-1.5 text-[10px] text-amber-700">
        <Wheat className="size-2.5" />
        {carbs}g
      </Badge>
      <Badge className="h-4 border-yellow-200 bg-yellow-100 px-1.5 text-[10px] text-yellow-700">
        <Droplet className="size-2.5" />
        {fat}g
      </Badge>
    </div>
  );
}

/**
 * Compact nutrition card showing daily calories as the primary metric.
 * Includes macro breakdown with icons, with a circular chart placeholder.
 */
export function CompactNutritionCard({
  plan,
  onClick,
  isLoading,
}: Readonly<CompactNutritionCardProps>) {
  if (isLoading) {
    return <StatCardSkeleton cardBgColor="bg-emerald-50/50" />;
  }

  if (!plan) {
    return (
      <StatCard
        cardBgColor="bg-emerald-50/50"
        label={m.stat_nutrition()}
        value="--"
        subtitle={m.stat_no_plan()}
        onClick={onClick}
      />
    );
  }

  return (
    <StatCard
      cardBgColor="bg-emerald-50/50"
      label={m.stat_daily_target()}
      value={plan.kcal.toLocaleString()}
      unit="kcal"
      subtitle={<MacroBadges protein={plan.protein} carbs={plan.carbs} fat={plan.fat} />}
      chartPlaceholder={<CircularChartSkeleton />}
      onClick={onClick}
    />
  );
}
