import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
  type AllergiesFormData,
  type BodyMeasurementsFormData,
  type FoodFormData,
  type MenstrualCycleFormData,
  type NoteFormData,
  type OnboardingDraft,
  type PersonFormData,
  type SubscriptionFormData,
  submitOnboarding,
} from "@/features/customers/api/onboarding-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { StepIndicator } from "@/shared/ui/step-indicator";

import { AllergiesStep } from "./allergies-step";
import { BodyMeasurementsStep } from "./body-measurements-step";
import { FoodStep } from "./food-step";
import { MenstrualCycleStep } from "./menstrual-cycle-step";
import { NotesStep } from "./notes-step";
import { ObjectiveStep } from "./objective-step";
import { PersonStep } from "./person-step";
import { SubscriptionStep } from "./subscription-step";

interface OnboardingDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { label: () => m.onboarding_step_personal() },
  { label: () => m.onboarding_step_subscription() },
  { label: () => m.onboarding_step_objective() },
  { label: () => m.onboarding_step_cycle() },
  { label: () => m.onboarding_step_body() },
  { label: () => m.onboarding_step_allergies() },
  { label: () => m.onboarding_step_food() },
  { label: () => m.onboarding_step_notes() },
];

const EMPTY_DRAFT: OnboardingDraft = {
  person: null,
  subscription: null,
  objective: null,
  menstrualCycle: null,
  bodyMeasurements: null,
  allergies: null,
  food: null,
  notes: null,
};

/** Encapsulates draft state and step navigation for the onboarding wizard. */
function useOnboardingDraft(organizationId: string, onCloseRef: React.RefObject<() => void>) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setDraft(EMPTY_DRAFT);
    setIsSubmitting(false);
    setError(null);
  }, []);

  const advance = useCallback((patch: Partial<OnboardingDraft>, nextStep: number) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setCurrentStep(nextStep);
  }, []);

  const goBack = useCallback((step: number) => setCurrentStep(step), []);

  const finish = useCallback(
    async (notes: NoteFormData[]) => {
      const finalDraft: OnboardingDraft = { ...draft, notes };
      setError(null);
      setIsSubmitting(true);
      try {
        await submitOnboarding(finalDraft, organizationId);
        await queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
        toast.success(m.onboarding_success());
        onCloseRef.current();
      } catch (err) {
        const message = err instanceof Error ? err.message : m.onboarding_error();
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [draft, organizationId, queryClient, onCloseRef],
  );

  return { currentStep, draft, isSubmitting, error, reset, advance, goBack, finish } as const;
}

/**
 * Multi-step dialog for onboarding a new customer.
 * All form data is accumulated locally in a draft. Mutations only fire
 * when the user completes the final step.
 */
export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";

  // Use a ref so the hook's finish callback always sees the latest handleClose
  // without creating a circular dependency.
  const handleCloseRef = useRef(() => {});
  const wizard = useOnboardingDraft(organizationId, handleCloseRef);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(wizard.reset, 200);
  }, [onOpenChange, wizard.reset]);

  handleCloseRef.current = handleClose;

  const stepLabels = STEPS.map((s) => ({ label: s.label() }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.onboarding_title()}</DialogTitle>
        </DialogHeader>

        <StepIndicator steps={stepLabels} currentStep={wizard.currentStep} />

        {wizard.error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {wizard.error}
          </div>
        ) : null}

        <StepContent organizationId={organizationId} wizard={wizard} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Step content — extracted to keep the parent component's complexity low.
// ---------------------------------------------------------------------------

interface StepContentProps {
  readonly organizationId: string;
  readonly wizard: ReturnType<typeof useOnboardingDraft>;
  readonly onClose: () => void;
}

function StepContent({ organizationId, wizard, onClose }: StepContentProps) {
  const { currentStep, draft, isSubmitting, advance, goBack, finish } = wizard;

  switch (currentStep) {
    case 0:
      return (
        <PersonStep
          initialData={draft.person ?? undefined}
          onSubmit={(data: PersonFormData) => advance({ person: data }, 1)}
          onCancel={onClose}
        />
      );
    case 1:
      return (
        <SubscriptionStep
          organizationId={organizationId}
          initialData={draft.subscription ?? undefined}
          onSubmit={(data: SubscriptionFormData) => advance({ subscription: data }, 2)}
          onBack={() => goBack(0)}
        />
      );
    case 2:
      return (
        <ObjectiveStep
          initialData={draft.objective ?? undefined}
          onSubmit={(note: string) => advance({ objective: note }, 3)}
          onBack={() => goBack(1)}
        />
      );
    case 3:
      return (
        <MenstrualCycleStep
          initialData={draft.menstrualCycle ?? undefined}
          onSubmit={(data: MenstrualCycleFormData) => advance({ menstrualCycle: data }, 4)}
          onBack={() => goBack(2)}
        />
      );
    case 4:
      return (
        <BodyMeasurementsStep
          initialData={draft.bodyMeasurements ?? undefined}
          onSubmit={(data: BodyMeasurementsFormData) => advance({ bodyMeasurements: data }, 5)}
          onBack={() => goBack(3)}
        />
      );
    case 5:
      return (
        <AllergiesStep
          initialData={draft.allergies ?? undefined}
          onSubmit={(data: AllergiesFormData) => advance({ allergies: data }, 6)}
          onBack={() => goBack(4)}
        />
      );
    case 6:
      return (
        <FoodStep
          initialData={draft.food ?? undefined}
          onSubmit={(data: FoodFormData) => advance({ food: data }, 7)}
          onBack={() => goBack(5)}
        />
      );
    case 7:
      return (
        <NotesStep
          initialData={draft.notes ?? undefined}
          isSubmitting={isSubmitting}
          onSubmit={finish}
          onBack={() => goBack(6)}
        />
      );
    default:
      return null;
  }
}
