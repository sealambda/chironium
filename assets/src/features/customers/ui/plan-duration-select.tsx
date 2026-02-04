import type { SubscriptionPlan } from "@/gql/graphql";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

interface PlanDurationSelectProps {
  plans: SubscriptionPlan[];
  value: string;
  onChange: (planId: string) => void;
  disabled?: boolean;
  className?: string;
}

function parsePlanLabel(plan: SubscriptionPlan): string {
  if (plan.name) return plan.name;
  if (plan.periodDuration) {
    const match = /^P(\d+)M$/i.exec(plan.periodDuration);
    if (match) return `${match[1]} months`;
  }
  return "Unknown";
}

/**
 * Toggle group for selecting subscription plan.
 * Displays plans fetched from the API following M3 segmented control pattern.
 */
export function PlanDurationSelect({
  plans,
  value,
  onChange,
  disabled,
  className,
}: PlanDurationSelectProps) {
  if (plans.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">Loading plans...</div>
    );
  }

  return (
    <ToggleGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className={className}
    >
      {plans.map((plan) => (
        <ToggleGroupItem key={plan.id} value={plan.id} disabled={disabled}>
          {parsePlanLabel(plan)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
