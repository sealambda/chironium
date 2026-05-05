import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchSubscriptionPlans } from "@/features/customers/api/subscriptions-api";
import { subscriptionSchema } from "@/features/customers/model/onboarding-schemas";
import type { SubscriptionFormData } from "@/features/customers/model/subscription-form";
import { SubscriptionFormFields } from "@/features/customers/ui/subscription/subscription-form-fields";
import * as m from "@/paraglide/messages";
import type { SubscriptionPlan } from "@/shared/types/subscriptions";
import { subscriptionPlansQueryKey } from "@/shared/utils/query-keys";

import { StepLayout } from "./step-layout";

interface SubscriptionStepProps {
  readonly organizationId: string;
  readonly initialData?: SubscriptionFormData;
  readonly onSubmit: (data: SubscriptionFormData | null) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: SubscriptionFormData | null) => void;
}

/**
 * Select a subscription plan and start date.
 */
export function SubscriptionStep({
  organizationId,
  initialData,
  onSubmit,
  onBack,
  onSaveDraft,
}: SubscriptionStepProps) {
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: subscriptionPlansQueryKey(organizationId),
    queryFn: () => fetchSubscriptionPlans(organizationId),
    enabled: Boolean(organizationId),
  });

  const form = useForm({
    defaultValues: {
      planId: initialData?.planId ?? "",
      startDate: initialData?.startDate ?? new Date().toISOString().split("T")[0],
    },
    validators: { onSubmit: subscriptionSchema },
    onSubmit: ({ value }) => {
      if (!value.planId) {
        onSubmit(null);
        return;
      }

      onSubmit({
        planId: value.planId,
        startDate: value.startDate || undefined,
      });
    },
  });
  const [planId, setPlanId] = useState(initialData?.planId ?? "");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ?? new Date().toISOString().split("T")[0] ?? "",
  );

  const handleBack = () => {
    const v = form.state.values;
    onSaveDraft?.(v.planId ? { planId: v.planId, startDate: v.startDate || undefined } : null);
    onBack();
  };

  return (
    <StepLayout
      title={m.step_subscription_title()}
      description={m.step_subscription_desc()}
      onSubmit={() => form.handleSubmit()}
      onBack={handleBack}
    >
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
        planTriggerTestId="onboarding-plan-trigger"
      />
    </StepLayout>
  );
}
