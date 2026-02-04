import { format } from "date-fns";
import type { NutritionPlanRecord } from "@/mocks/types";
import { MetricCard } from "@/shared/ui/metric-card";

interface NutritionCardProps {
  plan: NutritionPlanRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Card displaying current nutrition plan (kcal, macros).
 */
export function NutritionCard({
  plan,
  onClick,
  isLoading,
}: Readonly<NutritionCardProps>) {
  if (isLoading) {
    return (
      <MetricCard title="Nutrition" onClick={onClick}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-8 w-24 rounded bg-muted" />
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-16 rounded bg-muted" />
            ))}
          </div>
        </div>
      </MetricCard>
    );
  }

  if (!plan) {
    return (
      <MetricCard title="Nutrition" onClick={onClick}>
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">No active plan</p>
          <p className="text-muted-foreground/70 text-xs">
            Click to view history or create a new plan
          </p>
        </div>
      </MetricCard>
    );
  }

  const startFormatted = format(new Date(plan.startDate), "MMM d, yyyy");
  const endFormatted = plan.endDate
    ? format(new Date(plan.endDate), "MMM d, yyyy")
    : "Open-ended";

  return (
    <MetricCard
      title="Nutrition"
      lastUpdated={new Date(plan.startDate)}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Plan period */}
        <p className="text-muted-foreground text-sm">
          {startFormatted} — {endFormatted}
        </p>

        {/* Calories */}
        <div>
          <span className="font-bold text-2xl text-foreground">
            {plan.kcal.toLocaleString()}
          </span>
          <span className="ml-1 text-muted-foreground text-sm">kcal/day</span>
        </div>

        {/* Macros */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-medium text-foreground">{plan.protein}g</span>
            <span className="ml-1 text-muted-foreground">protein</span>
          </div>
          <div>
            <span className="font-medium text-foreground">{plan.carbs}g</span>
            <span className="ml-1 text-muted-foreground">carbs</span>
          </div>
          <div>
            <span className="font-medium text-foreground">{plan.fat}g</span>
            <span className="ml-1 text-muted-foreground">fat</span>
          </div>
        </div>
      </div>
    </MetricCard>
  );
}
