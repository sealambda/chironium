import { Check } from "lucide-react";

import * as m from "@/paraglide/messages";
import { cn } from "@/shared/utils/utils";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  readonly steps: Step[];
  readonly currentStep: number;
}

const COMPACT_THRESHOLD = 5;

function circleClass(isCompleted: boolean, isActive: boolean) {
  if (isCompleted) {
    return "bg-primary text-primary-foreground";
  }
  if (isActive) {
    return "border-2 border-primary text-primary";
  }
  return "border border-muted-foreground/30 text-muted-foreground";
}

function labelClass(isCompleted: boolean, isActive: boolean) {
  if (isActive) {
    return "font-medium text-foreground";
  }
  if (isCompleted) {
    return "text-foreground";
  }
  return "text-muted-foreground";
}

/**
 * Horizontal stepper showing progress through a multi-step flow.
 * Automatically switches to a compact layout (no labels, shorter connectors)
 * when the number of steps exceeds the threshold.
 */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const compact = steps.length > COMPACT_THRESHOLD;

  return (
    <nav
      aria-label={m.common_progress()}
      className="flex items-center justify-center gap-1.5 sm:gap-2"
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full font-medium text-xs transition-colors",
                  compact ? "size-6" : "size-7",
                  circleClass(isCompleted, isActive),
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : index + 1}
              </div>
              {!compact && (
                <span className={cn("hidden text-sm sm:inline", labelClass(isCompleted, isActive))}>
                  {step.label}
                </span>
              )}
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px",
                  compact ? "w-3 sm:w-4" : "w-6 sm:w-10",
                  index < currentStep ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
