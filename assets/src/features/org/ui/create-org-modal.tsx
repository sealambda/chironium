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

import { OrgDetailsStep } from "./org-details-step";
import { PlansStep } from "./plans-step";

interface CreateOrgModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const STEPS = [{ label: () => m.org_step_details() }, { label: () => m.org_step_plans() }];

/**
 * Multi-step dialog for creating a new organisation.
 * Step 1: Name and slug. Step 2: Define subscription plans.
 */
export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps) {
  const { createOrg, selectOrg } = useOrg();
  const [currentStep, setCurrentStep] = useState(0);
  const [organizationId, setOrganizationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setCurrentStep(0);
    setOrganizationId("");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetState, 200);
  }, [onOpenChange, resetState]);

  const handleOrgSubmit = useCallback(
    async (data: { name: string; slug: string }) => {
      setError(null);
      try {
        const newOrg = await createOrg(data);
        setOrganizationId(newOrg.id);
        setCurrentStep(1);
      } catch (err) {
        const message = err instanceof Error ? err.message : m.org_create_error();
        setError(message);
        throw err;
      }
    },
    [createOrg],
  );

  const handleFinish = useCallback(async () => {
    try {
      await selectOrg(organizationId);
      toast.success(m.org_created());
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : m.org_create_error();
      setError(message);
    }
  }, [organizationId, selectOrg, handleClose]);

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

        {currentStep === 0 && <OrgDetailsStep onSubmit={handleOrgSubmit} onCancel={handleClose} />}

        {currentStep === 1 && <PlansStep organizationId={organizationId} onFinish={handleFinish} />}
      </DialogContent>
    </Dialog>
  );
}
