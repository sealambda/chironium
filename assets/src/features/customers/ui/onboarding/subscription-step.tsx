import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";

import {
  fetchSubscriptionPlans,
  type SubscriptionFormData,
  type SubscriptionPlan,
} from "@/features/customers/api/subscriptions-api";
import { subscriptionSchema } from "@/features/customers/model/onboarding-schemas";
import * as m from "@/paraglide/messages";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
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
  readonly onSaveDraft?: (data: SubscriptionFormData) => void;
}

function ucumLabel(code: string): string {
  switch (code) {
    case "MO":
      return m.duration_months();
    case "A":
      return m.duration_years();
    case "WK":
      return m.duration_weeks();
    case "D":
      return m.duration_days();
    default:
      return code;
  }
}

function formatPlanLabel(plan: SubscriptionPlan): string {
  const parts: string[] = [];
  if (plan.name) {
    parts.push(plan.name);
  }
  if (plan.duration?.value && plan.duration?.code) {
    parts.push(`(${plan.duration.value} ${ucumLabel(plan.duration.code)})`);
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
  onSaveDraft,
}: SubscriptionStepProps) {
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscriptionPlans", organizationId],
    queryFn: () => fetchSubscriptionPlans(organizationId),
    enabled: Boolean(organizationId),
  });

  const form = useForm({
    defaultValues: {
      planId: initialData?.planId ?? "",
      startDate: initialData?.startDate ?? new Date().toISOString().split("T")[0],
    },
    // @ts-expect-error ZodDefault input type includes undefined, TanStack Form expects exact match
    validators: { onSubmit: subscriptionSchema },
    onSubmit: ({ value }) => {
      onSubmit({
        planId: value.planId,
        startDate: value.startDate || undefined,
      });
    },
  });

  const handleBack = () => {
    const v = form.state.values;
    onSaveDraft?.({ planId: v.planId, startDate: v.startDate || undefined });
    onBack();
  };

  return (
    <StepLayout
      title={m.step_subscription_title()}
      description={m.step_subscription_desc()}
      submitDisabled={plans.length === 0 && !plansLoading}
      onSubmit={() => form.handleSubmit()}
      onBack={handleBack}
    >
      <FieldGroup>
        <form.Field
          name="planId"
          validators={{
            onBlur: ({ value }) => {
              if (!value) {
                return m.validation_plan_required();
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel required>{m.field_plan()}</FieldLabel>
              <PlanSelector
                plans={plans}
                loading={plansLoading}
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
              />
              {field.state.meta.errors.length > 0 ? (
                <FieldError
                  errors={field.state.meta.errors.map((e) =>
                    typeof e === "string" ? { message: e } : e,
                  )}
                />
              ) : null}
            </Field>
          )}
        </form.Field>

        <form.Field name="startDate">
          {(field) => (
            <Field>
              <FieldLabel>{m.field_start_date()}</FieldLabel>
              <DatePickerString
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
                endMonth={new Date(new Date().getFullYear() + 5, 11, 31)}
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </StepLayout>
  );
}
