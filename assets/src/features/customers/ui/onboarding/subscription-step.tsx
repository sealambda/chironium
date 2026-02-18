import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  fetchSubscriptionPlans,
  type SubscriptionFormData,
  type SubscriptionPlan,
} from "@/features/customers/api/subscriptions-api";
import * as m from "@/paraglide/messages";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";

import { StepLayout } from "./step-layout";

interface SubscriptionStepProps {
  readonly organizationId: string;
  readonly initialData?: SubscriptionFormData;
  readonly onSubmit: (data: SubscriptionFormData) => void;
  readonly onBack: () => void;
}

function formatPlanLabel(plan: SubscriptionPlan): string {
  const parts: string[] = [];
  if (plan.name) {
    parts.push(plan.name);
  }
  if (plan.duration?.value && plan.duration?.code) {
    parts.push(`(${plan.duration.value} ${plan.duration.code})`);
  }
  if (plan.priceAmount) {
    parts.push(`- ${plan.priceAmount.amount} ${plan.priceAmount.currency}`);
  }
  return parts.join(" ") || plan.id;
}

interface PlanSelectorProps {
  readonly plans: SubscriptionPlan[];
  readonly loading: boolean;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function PlanSelector({ plans, loading, value, onChange }: PlanSelectorProps) {
  if (loading) {
    return <Skeleton className="h-9 w-full rounded-md" />;
  }

  if (plans.length === 0) {
    return <p className="text-muted-foreground text-sm">{m.plan_no_plans()}</p>;
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v ?? "")}
      items={plans.map((plan) => ({ value: plan.id, label: formatPlanLabel(plan) }))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={m.plan_placeholder()} />
      </SelectTrigger>
      <SelectPositioner>
        <SelectContent>
          {plans.map((plan) => (
            <SelectItem key={plan.id} value={plan.id}>
              {formatPlanLabel(plan)}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPositioner>
    </Select>
  );
}

/**
 * Step 2: Select a subscription plan and start date.
 */
export function SubscriptionStep({
  organizationId,
  initialData,
  onSubmit,
  onBack,
}: SubscriptionStepProps) {
  const [planId, setPlanId] = useState(initialData?.planId ?? "");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ?? new Date().toISOString().split("T")[0],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscriptionPlans", organizationId],
    queryFn: () => fetchSubscriptionPlans(organizationId),
    enabled: Boolean(organizationId),
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!planId) {
      newErrors.planId = m.validation_required();
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onSubmit({
      planId,
      startDate: startDate || undefined,
    });
  };

  return (
    <StepLayout
      title={m.step_subscription_title()}
      description={m.step_subscription_desc()}
      submitDisabled={plans.length === 0 && !plansLoading}
      onSubmit={handleSubmit}
      onBack={onBack}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(errors.planId)}>
          <FieldLabel>{m.field_plan()}</FieldLabel>
          <PlanSelector
            plans={plans}
            loading={plansLoading}
            value={planId}
            onChange={(value) => {
              setPlanId(value);
              if (errors.planId) {
                setErrors((prev) => ({ ...prev, planId: "" }));
              }
            }}
          />
          {errors.planId ? <FieldError>{errors.planId}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel>{m.field_start_date()}</FieldLabel>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}
