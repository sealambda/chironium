import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createSubscription,
  fetchSubscriptionPlans,
  updateSubscription,
} from "@/features/customers/api/subscriptions-api";
import { subscriptionSchema } from "@/features/customers/model/onboarding-schemas";
import { SubscriptionFormFields } from "@/features/customers/ui/subscription/subscription-form-fields";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type { SubscriptionPlan, SubscriptionRecord } from "@/shared/types/subscriptions";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  customersQueryKeys,
  personQueryKeys,
  subscriptionPlansQueryKey,
} from "@/shared/utils/query-keys";

interface EditSubscriptionDialogProps {
  readonly personId: string;
  readonly currentSubscription?: SubscriptionRecord;
  readonly children?: React.ReactNode;
}

export function EditSubscriptionDialog({
  personId,
  currentSubscription,
  children,
}: Readonly<EditSubscriptionDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { selectedOrg } = useOrg();
  const organizationId = selectedOrg?.id ?? "";
  const queryClient = useQueryClient();

  const initialValues = useMemo(
    () => ({
      planId: currentSubscription?.plan?.id ?? "",
      startDate: currentSubscription?.startDate ?? new Date().toISOString().split("T")[0] ?? "",
    }),
    [currentSubscription],
  );
  const [planId, setPlanId] = useState(initialValues.planId);
  const [startDate, setStartDate] = useState(initialValues.startDate);

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: subscriptionPlansQueryKey(organizationId),
    queryFn: () => fetchSubscriptionPlans(organizationId),
    enabled: Boolean(organizationId),
  });

  const form = useForm({
    defaultValues: initialValues,
    validators: { onSubmit: subscriptionSchema },
    onSubmit: async ({ value }) => {
      if (!value.planId || !organizationId) {
        return;
      }

      setSaving(true);
      try {
        if (currentSubscription) {
          await updateSubscription(
            currentSubscription.id,
            { planId: value.planId, startDate: value.startDate || undefined },
            organizationId,
          );
        } else {
          await createSubscription(
            { planId: value.planId, startDate: value.startDate || undefined },
            personId,
            organizationId,
          );
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: personQueryKeys.subscriptions(personId, organizationId),
          }),
          queryClient.invalidateQueries({
            queryKey: customersQueryKeys.personsPrefix(organizationId),
          }),
          queryClient.invalidateQueries({
            queryKey: customersQueryKeys.subscriptions(organizationId),
          }),
        ]);

        setOpen(false);
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  const didResetOnOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      didResetOnOpen.current = false;
      return;
    }

    if (didResetOnOpen.current) {
      return;
    }

    didResetOnOpen.current = true;
    form.reset(initialValues);
    setPlanId(initialValues.planId);
    setStartDate(initialValues.startDate);
  }, [form, initialValues, open]);

  useEffect(() => {
    if (!open || currentSubscription || planId || plans.length === 0) {
      return;
    }

    const firstPlanId = plans[0]?.id;
    if (!firstPlanId) {
      return;
    }

    setPlanId(firstPlanId);
    form.setFieldValue("planId", firstPlanId);
  }, [currentSubscription, form, open, planId, plans]);

  let submitLabel = currentSubscription ? m.common_save() : m.common_add();
  if (saving) {
    submitLabel = m.common_saving();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (children as React.ReactElement | undefined) ?? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Edit subscription"
              data-testid="customer-subscription-edit-button"
            >
              <Pencil className="size-3.5" />
            </Button>
          )
        }
      />

      <DialogContent data-testid="customer-subscription-dialog">
        <DialogHeader>
          <DialogTitle>{m.step_subscription_title()}</DialogTitle>
        </DialogHeader>

        <SubscriptionFormFields
          plans={plans}
          plansLoading={plansLoading}
          planId={planId}
          startDate={startDate}
          onPlanChange={(nextValue) => {
            setPlanId(nextValue);
            form.setFieldValue("planId", nextValue);
          }}
          onStartDateChange={(nextValue) => {
            setStartDate(nextValue);
            form.setFieldValue("startDate", nextValue);
          }}
          planTriggerTestId="customer-subscription-plan-trigger"
          planOptionTestIdPrefix="customer-subscription-plan-option-"
          startDateInputTestId="customer-subscription-start-date-input"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button
            onClick={() => form.handleSubmit()}
            loading={saving}
            disabled={!planId}
            data-testid="customer-subscription-save-button"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
