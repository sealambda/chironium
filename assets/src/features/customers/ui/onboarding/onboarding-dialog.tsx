import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  type AllergiesFormData,
  type BodyMeasurementsFormData,
  createAllergiesAndIntolerances,
  createFoodObservations,
  createMenstrualCycleObservation,
  createNoteObservations,
  createObjective,
  createPatientWithPerson,
  createSubscription,
  type FoodFormData,
  logBodyMeasurements,
  type MenstrualCycleFormData,
  type NoteFormData,
  type PersonFormData,
  type SubscriptionFormData,
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

/**
 * Multi-step dialog for onboarding a new customer.
 * Orchestrates person creation, subscription setup, objective capture,
 * menstrual cycle, body measurements, allergies, food preferences, and notes.
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

  /** Shared error handler for all step submissions. */
  const withErrorHandling = useCallback(async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : m.onboarding_error();
      setError(message);
      throw err;
    }
  }, []);

  const handlePersonSubmit = useCallback(
    async (data: PersonFormData) => {
      await withErrorHandling(async () => {
        const result = await createPatientWithPerson(data, organizationId);
        setPatientId(result.patientId);
        setPersonId(result.personId);
        setCurrentStep(1);
      });
    },
    [organizationId, withErrorHandling],
  );

  const handleSubscriptionSubmit = useCallback(
    async (data: SubscriptionFormData) => {
      await withErrorHandling(async () => {
        await createSubscription(data, personId, organizationId);
        setCurrentStep(2);
      });
    },
    [personId, organizationId, withErrorHandling],
  );

  const handleObjectiveSubmit = useCallback(
    async (note: string) => {
      await withErrorHandling(async () => {
        await createObjective(note, patientId, organizationId);
        setCurrentStep(3);
      });
    },
    [patientId, organizationId, withErrorHandling],
  );

  const handleMenstrualCycleSubmit = useCallback(
    async (data: MenstrualCycleFormData) => {
      await withErrorHandling(async () => {
        const hasData = data.startDate || data.endDate || data.notes.trim();
        if (hasData) {
          await createMenstrualCycleObservation(data, patientId, organizationId);
        }
        setCurrentStep(4);
      });
    },
    [patientId, organizationId, withErrorHandling],
  );

  const handleBodyMeasurementsSubmit = useCallback(
    async (data: BodyMeasurementsFormData) => {
      await withErrorHandling(async () => {
        const hasData = data.heightCm || data.weightKg;
        if (hasData) {
          await logBodyMeasurements(data, patientId, organizationId);
        }
        setCurrentStep(5);
      });
    },
    [patientId, organizationId, withErrorHandling],
  );

  const handleAllergiesSubmit = useCallback(
    async (data: AllergiesFormData) => {
      await withErrorHandling(async () => {
        const hasData = data.allergies.trim() || data.intolerances.trim();
        if (hasData) {
          await createAllergiesAndIntolerances(data, patientId, organizationId);
        }
        setCurrentStep(6);
      });
    },
    [patientId, organizationId, withErrorHandling],
  );

  const handleFoodSubmit = useCallback(
    async (data: FoodFormData) => {
      await withErrorHandling(async () => {
        const hasData = data.included.trim() || data.excluded.trim();
        if (hasData) {
          await createFoodObservations(data, patientId, organizationId);
        }
        setCurrentStep(7);
      });
    },
    [patientId, organizationId, withErrorHandling],
  );

  const handleNotesSubmit = useCallback(
    async (notes: NoteFormData[]) => {
      await withErrorHandling(async () => {
        const hasData = notes.some((n) => n.title.trim() || n.body.trim());
        if (hasData) {
          await createNoteObservations(notes, patientId, organizationId);
        }
        await queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
        toast.success(m.onboarding_success());
        handleClose();
      });
    },
    [patientId, organizationId, queryClient, handleClose, withErrorHandling],
  );

  const stepLabels = STEPS.map((s) => ({ label: s.label() }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.onboarding_title()}</DialogTitle>
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

        {currentStep === 3 && (
          <MenstrualCycleStep
            onSubmit={handleMenstrualCycleSubmit}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <BodyMeasurementsStep
            onSubmit={handleBodyMeasurementsSubmit}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <AllergiesStep onSubmit={handleAllergiesSubmit} onBack={() => setCurrentStep(4)} />
        )}

        {currentStep === 6 && (
          <FoodStep onSubmit={handleFoodSubmit} onBack={() => setCurrentStep(5)} />
        )}

        {currentStep === 7 && (
          <NotesStep onSubmit={handleNotesSubmit} onBack={() => setCurrentStep(6)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
