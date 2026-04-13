import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import type { AnthropometryFormData } from "@/features/customers/api/anthropometry-api";
import type { FoodFormData } from "@/features/customers/api/food-preferences-api";
import type { MedicationsFormData } from "@/features/customers/api/medications-api";
import type {
  ClinicalNoteFormData,
  MenstrualCycleFormData,
} from "@/features/customers/api/observations-api";
import { type OnboardingDraft, submitOnboarding } from "@/features/customers/api/onboarding-api";
import type { PersonFormData } from "@/features/customers/api/patients-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { ResponsiveStepIndicator } from "@/shared/ui/responsive-step-indicator";
import { customersQueryKeys } from "@/shared/utils/query-keys";

import { AnthropometryStep } from "./anthropometry-step";
import { FoodStep } from "./food-step";
import { MedicationsStep } from "./medications-step";
import { MenstrualCycleStep } from "./menstrual-cycle-step";
import { ObjectiveStep } from "./objective-step";
import { ObservationsStep } from "./observations-step";
import {
  PathologiesAllergiesStep,
  type PathologiesAllergiesStepData,
} from "./pathologies-allergies-step";
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
  { label: () => m.onboarding_step_anthropometry() },
  { label: () => m.onboarding_step_pathologies_allergies() },
  { label: () => m.onboarding_step_medications() },
  { label: () => m.onboarding_step_food() },
  { label: () => m.onboarding_step_cycle() },
  { label: () => m.onboarding_step_observations() },
];

const EMPTY_DRAFT: OnboardingDraft = {
  person: null,
  subscription: null,
  menstrualCycle: null,
  anthropometry: null,
  pathologies: null,
  allergies: null,
  medications: null,
  food: null,
  objective: null,
  notes: null,
  pendingNote: null,
};

/** Encapsulates draft state and step navigation for the onboarding wizard. */
function useOnboardingDraft(
  organizationId: string,
  userId: string,
  userName: string,
  onCloseRef: React.RefObject<() => void>,
) {
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

  const saveDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const finish = useCallback(
    async (notes: ClinicalNoteFormData[]) => {
      const finalDraft: OnboardingDraft = { ...draft, notes };
      setError(null);
      setIsSubmitting(true);
      try {
        await submitOnboarding(finalDraft, organizationId, userId, userName);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: customersQueryKeys.personsPrefix(organizationId),
          }),
          queryClient.invalidateQueries({
            queryKey: customersQueryKeys.subscriptions(organizationId),
          }),
        ]);
        toast.success(
          <span data-testid="toast-customer-onboarding-complete">{m.onboarding_success()}</span>,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : m.onboarding_error();
        setError(message);
      } finally {
        setIsSubmitting(false);
        onCloseRef.current();
      }
    },
    [draft, organizationId, userId, userName, queryClient, onCloseRef],
  );

  return {
    currentStep,
    draft,
    isSubmitting,
    error,
    reset,
    advance,
    goBack,
    saveDraft,
    finish,
  } as const;
}

/**
 * Multi-step dialog for onboarding a new customer.
 * All form data is accumulated locally in a draft. Mutations only fire
 * when the user completes the final step.
 */
export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";
  const { user } = useCurrentUser();
  const [confirmClose, setConfirmClose] = useState(false);

  // Use a ref so the hook's finish callback always sees the latest handleClose
  // without creating a circular dependency.
  const handleCloseRef = useRef(() => {});
  const wizard = useOnboardingDraft(
    organizationId,
    user?.id ?? "",
    user?.name ?? "",
    handleCloseRef,
  );

  const hasDraftData = Object.values(wizard.draft).some((v) => v !== null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(wizard.reset, 200);
  }, [onOpenChange, wizard.reset]);

  handleCloseRef.current = handleClose;

  const handleDialogChange = useCallback(() => {
    if (hasDraftData) {
      setConfirmClose(true);
      return;
    }
    handleClose();
  }, [hasDraftData, handleClose]);

  const stepLabels = STEPS.map((s) => ({ label: s.label() }));
  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-xl" data-testid="customer-onboarding-dialog">
          <DialogHeader>
            <DialogTitle>{m.onboarding_title()}</DialogTitle>
          </DialogHeader>

          <ResponsiveStepIndicator steps={stepLabels} currentStep={wizard.currentStep} />

          {wizard.error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {wizard.error}
            </div>
          ) : null}

          <StepContent
            organizationId={organizationId}
            wizard={wizard}
            onClose={handleDialogChange}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.onboarding_confirm_abandon_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.onboarding_confirm_abandon_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.onboarding_confirm_abandon_keep()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmClose(false);
                handleClose();
              }}
            >
              {m.onboarding_confirm_abandon_discard()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const { currentStep, draft, isSubmitting, advance, goBack, saveDraft, finish } = wizard;

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
          onSubmit={(data) => advance({ subscription: data }, 2)}
          onBack={() => goBack(0)}
          onSaveDraft={(data) => saveDraft({ subscription: data })}
        />
      );
    case 2:
      return (
        <ObjectiveStep
          initialData={draft.objective ?? undefined}
          onSubmit={(note) => advance({ objective: note }, 3)}
          onBack={() => goBack(1)}
          onSaveDraft={(note) => saveDraft({ objective: note })}
        />
      );
    case 3:
      return (
        <AnthropometryStep
          initialData={draft.anthropometry ?? undefined}
          onSubmit={(data: AnthropometryFormData) => advance({ anthropometry: data }, 4)}
          onBack={() => goBack(2)}
          onSaveDraft={(data) => saveDraft({ anthropometry: data })}
        />
      );
    case 4:
      return (
        <PathologiesAllergiesStep
          initialPathologies={draft.pathologies ?? undefined}
          initialAllergies={draft.allergies ?? undefined}
          onSubmit={(data: PathologiesAllergiesStepData) =>
            advance({ pathologies: data.pathologies, allergies: data.allergies }, 5)
          }
          onBack={() => goBack(3)}
          onSaveDraft={(data) =>
            saveDraft({ pathologies: data.pathologies, allergies: data.allergies })
          }
        />
      );
    case 5:
      return (
        <MedicationsStep
          initialData={draft.medications ?? undefined}
          onSubmit={(data: MedicationsFormData) => advance({ medications: data }, 6)}
          onBack={() => goBack(4)}
          onSaveDraft={(data) => saveDraft({ medications: data })}
        />
      );
    case 6:
      return (
        <FoodStep
          initialData={draft.food ?? undefined}
          onSubmit={(data: FoodFormData) => advance({ food: data }, 7)}
          onBack={() => goBack(5)}
          onSaveDraft={(data) => saveDraft({ food: data })}
        />
      );
    case 7:
      return (
        <MenstrualCycleStep
          initialData={draft.menstrualCycle ?? undefined}
          gender={draft.person?.gender}
          onSubmit={(data: MenstrualCycleFormData) => advance({ menstrualCycle: data }, 8)}
          onBack={() => goBack(6)}
          onSaveDraft={(data) => saveDraft({ menstrualCycle: data })}
        />
      );
    case 8:
      return (
        <ObservationsStep
          initialData={draft.notes ?? undefined}
          initialPending={draft.pendingNote ?? undefined}
          isSubmitting={isSubmitting}
          onSubmit={finish}
          onBack={() => goBack(7)}
          onSaveDraft={(notes, pending) => saveDraft({ notes, pendingNote: pending ?? null })}
        />
      );
    default:
      return null;
  }
}
