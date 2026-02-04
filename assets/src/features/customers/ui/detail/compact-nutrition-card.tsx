import { Beef, Droplet, Utensils, Wheat } from "lucide-react";
import type { NutritionPlanRecord } from "@/mocks/types";
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
function MacroBadges({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <Badge className="h-4 px-1.5 text-[10px] bg-red-100 text-red-700 border-red-200">
        <Beef className="size-2.5" />
        {protein}g
      </Badge>
      <Badge className="h-4 px-1.5 text-[10px] bg-amber-100 text-amber-700 border-amber-200">
        <Wheat className="size-2.5" />
        {carbs}g
      </Badge>
      <Badge className="h-4 px-1.5 text-[10px] bg-yellow-100 text-yellow-700 border-yellow-200">
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
        icon={<Utensils className="size-4" />}
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-600"
        cardBgColor="bg-emerald-50/50"
        label="Nutrition"
        value="--"
        subtitle="No active plan"
        onClick={onClick}
      />
    );
  }

  return (
    <StatCard
      icon={<Utensils className="size-4" />}
      iconBgColor="bg-emerald-100"
      iconColor="text-emerald-600"
      cardBgColor="bg-emerald-50/50"
      label="Daily Target"
      value={plan.kcal.toLocaleString()}
      unit="kcal"
      subtitle={
        <MacroBadges protein={plan.protein} carbs={plan.carbs} fat={plan.fat} />
      }
      chartPlaceholder={<CircularChartSkeleton />}
      onClick={onClick}
    />
  );
}
