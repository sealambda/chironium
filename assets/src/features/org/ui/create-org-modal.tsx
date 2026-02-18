import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  type OrgCreationDraft,
  type PlanFormData,
  submitOrgCreation,
} from "@/features/org/api/org-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { ORG_QUERY_KEY } from "@/features/org/store/org-store";
import * as m from "@/paraglide/messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { StepIndicator } from "@/shared/ui/step-indicator";

import { OrgDetailsStep } from "./org-details-step";
import { PlansStep } from "./plans-step";

interface CreateOrgModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const STEPS = [{ label: () => m.org_step_details() }, { label: () => m.org_step_plans() }];

const EMPTY_DRAFT: OrgCreationDraft = {
  orgDetails: null,
  plans: [],
};

/**
 * Multi-step dialog for creating a new organisation.
 * All form data is accumulated locally in a draft. Mutations only fire
 * when the user clicks "Finish" on the last step.
 */
export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps) {
  const { selectOrg } = useOrg();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<OrgCreationDraft>(EMPTY_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setCurrentStep(0);
    setDraft(EMPTY_DRAFT);
    setIsSubmitting(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetState, 200);
  }, [onOpenChange, resetState]);

  const handleOrgDetailsNext = useCallback((data: { name: string; slug: string }) => {
    setDraft((prev) => ({ ...prev, orgDetails: data }));
    setCurrentStep(1);
  }, []);

  const handleFinish = useCallback(
    async (plans: PlanFormData[]) => {
      const finalDraft: OrgCreationDraft = { ...draft, plans };
      setError(null);
      setIsSubmitting(true);
      try {
        const orgId = await submitOrgCreation(finalDraft);
        // Invalidate the cached org list so selectOrg finds the new org.
        await queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
        await selectOrg(orgId);
        toast.success(m.org_created());
        handleClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : m.org_create_error();
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [draft, queryClient, selectOrg, handleClose],
  );

  const stepLabels = STEPS.map((s) => ({ label: s.label() }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.org_create()}</DialogTitle>
          <DialogDescription>{m.org_create_desc()}</DialogDescription>
        </DialogHeader>

        <StepIndicator steps={stepLabels} currentStep={currentStep} />

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </div>
        ) : null}

        {currentStep === 0 && (
          <OrgDetailsStep
            initialData={draft.orgDetails ?? undefined}
            onSubmit={handleOrgDetailsNext}
            onCancel={handleClose}
          />
        )}

        {currentStep === 1 && (
          <PlansStep
            initialData={draft.plans.length > 0 ? draft.plans : undefined}
            isSubmitting={isSubmitting}
            onFinish={handleFinish}
            onBack={() => setCurrentStep(0)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
