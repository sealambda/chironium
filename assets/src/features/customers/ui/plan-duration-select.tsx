import type { SubscriptionPlan } from "@/gql/graphql";
import * as m from "@/paraglide/messages";
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
    if (match) return m.plan_months({ count: Number(match[1]) });
  }
  return m.plan_unknown();
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
      <div className="text-muted-foreground text-sm">{m.plan_loading()}</div>
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
