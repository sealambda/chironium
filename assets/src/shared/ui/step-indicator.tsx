import { Check } from "lucide-react";

import { cn } from "@/shared/utils/utils";

interface Step {
  label: string;
}

interface StepIndicatorProps {
  readonly steps: Step[];
  readonly currentStep: number;
}

/**
 * Horizontal stepper showing progress through a multi-step flow.
 * Follows Material Design step indicator patterns.
 */
export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full font-medium text-xs transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "border-2 border-primary text-primary",
                  !isCompleted &&
                    !isActive &&
                    "border border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  isActive && "font-medium text-foreground",
                  isCompleted && "text-foreground",
                  !isCompleted && !isActive && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-10",
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
