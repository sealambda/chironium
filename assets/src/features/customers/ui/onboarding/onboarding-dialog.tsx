import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { StepIndicator } from "@/shared/ui/step-indicator";

import {
  createObjective,
  createPatientWithPerson,
  createSubscription,
  type PersonFormData,
  type SubscriptionFormData,
} from "../../api/onboarding-api";
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
];

/**
 * Multi-step dialog for onboarding a new customer.
 * Orchestrates person creation, subscription setup, and objective capture.
 */
export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const organizationId = selectedOrg?.id ?? "";

  const resetState = useCallback(() => {
    setCurrentStep(0);
    setPatientId("");
    setPersonId("");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Delay reset so the closing animation completes.
    setTimeout(resetState, 200);
  }, [onOpenChange, resetState]);

  const handlePersonSubmit = useCallback(
    async (data: PersonFormData) => {
      setError(null);
      try {
        const result = await createPatientWithPerson(data, organizationId);
        setPatientId(result.patientId);
        setPersonId(result.personId);
        setCurrentStep(1);
      } catch (err) {
        const message = err instanceof Error ? err.message : m.onboarding_error();
        setError(message);
        throw err;
      }
    },
    [organizationId],
  );

  const handleSubscriptionSubmit = useCallback(
    async (data: SubscriptionFormData) => {
      setError(null);
      try {
        await createSubscription(data, personId, organizationId);
        setCurrentStep(2);
      } catch (err) {
        const message = err instanceof Error ? err.message : m.onboarding_error();
        setError(message);
        throw err;
      }
    },
    [personId, organizationId],
  );

  const handleObjectiveSubmit = useCallback(
    async (note: string) => {
      setError(null);
      try {
        await createObjective(note, patientId, organizationId);
        // biome-ignore lint/nursery/useAwaitThenable: queryClient.invalidateQueries returns Promise.
        await queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
        toast.success(m.onboarding_success());
        handleClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : m.onboarding_error();
        setError(message);
        throw err;
      }
    },
    [patientId, organizationId, queryClient, handleClose],
  );

  const stepLabels = STEPS.map((s) => ({ label: s.label() }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.onboarding_title()}</DialogTitle>
          <DialogDescription>{m.onboarding_desc()}</DialogDescription>
        </DialogHeader>

        <StepIndicator steps={stepLabels} currentStep={currentStep} />

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </div>
        ) : null}

        {currentStep === 0 && <PersonStep onSubmit={handlePersonSubmit} onCancel={handleClose} />}

        {currentStep === 1 && (
          <SubscriptionStep
            organizationId={organizationId}
            onSubmit={handleSubscriptionSubmit}
            onBack={() => setCurrentStep(0)}
          />
        )}

        {currentStep === 2 && (
          <ObjectiveStep onSubmit={handleObjectiveSubmit} onBack={() => setCurrentStep(1)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
