import { StepIndicator } from "@/shared/ui/step-indicator";

interface Step {
  label: string;
}

interface ResponsiveStepIndicatorProps {
  readonly steps: Step[];
  readonly currentStep: number;
}

/**
 * Shows a compact progress bar on mobile and the full step indicator on larger screens.
 */
export function ResponsiveStepIndicator({ steps, currentStep }: ResponsiveStepIndicatorProps) {
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-2">
      <div className="sm:hidden">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {currentStep + 1} / {steps.length}
        </p>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>
    </div>
  );
}
