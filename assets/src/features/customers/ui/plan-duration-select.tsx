import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

interface PlanDurationSelectProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const PLAN_OPTIONS = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
] as const;

/**
 * Toggle group for selecting plan duration.
 * Supports 3, 6, and 12 month plans following M3 segmented control pattern.
 */
export function PlanDurationSelect({
  value,
  onChange,
  disabled,
  className,
}: PlanDurationSelectProps) {
  return (
    <ToggleGroup
      value={String(value)}
      onValueChange={(val) => onChange(Number(val))}
      disabled={disabled}
      className={className}
    >
      {PLAN_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={String(option.value)}
          disabled={disabled}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
