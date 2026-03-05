import type { ReactNode } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DialogFooter } from "@/shared/ui/dialog";

interface StepLayoutProps {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly isSubmitting?: boolean;
  readonly isLastStep?: boolean;
  readonly submitDisabled?: boolean;
  readonly submitLabel?: string;
  readonly submittingLabel?: string;
  readonly onSubmit: () => void;
  readonly onBack?: () => void;
  readonly onCancel?: () => void;
}

/**
 * Shared layout for every onboarding step.
 * Renders a heading (title + description), the step's form content, and footer buttons.
 */
export function StepLayout({
  title,
  description,
  children,
  isSubmitting,
  isLastStep,
  submitDisabled,
  submitLabel,
  submittingLabel,
  onSubmit,
  onBack,
  onCancel,
}: StepLayoutProps) {
  const submitText = submitLabel ?? (isLastStep ? m.common_finish() : m.common_next());
  const busyText = submittingLabel ?? m.common_saving();
  const buttonLabel = isSubmitting ? busyText : submitText;

  return (
    <>
      <div className="space-y-1">
        <h3 className="font-medium text-base">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {children}

      <DialogFooter>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {m.common_cancel()}
          </Button>
        ) : null}
        {onBack ? (
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            {m.common_back()}
          </Button>
        ) : null}
        <Button onClick={onSubmit} disabled={isSubmitting || submitDisabled}>
          {buttonLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
