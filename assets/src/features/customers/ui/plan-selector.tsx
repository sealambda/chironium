import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

interface PlanSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const PLAN_OPTIONS = [
  { id: "plan-3m", label: "3 months" },
  { id: "plan-6m", label: "6 months" },
  { id: "plan-12m", label: "12 months" },
] as const;

/**
 * Toggle group for selecting a subscription plan by ID.
 * Uses plan IDs (e.g., "plan-3m") that map to duration via getPlanDuration().
 * Follows M3 segmented control pattern.
 */
export function PlanSelector({
  value,
  onChange,
  disabled,
  className,
}: PlanSelectorProps) {
  return (
    <ToggleGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className={className}
    >
      {PLAN_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.id} value={option.id} disabled={disabled}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
