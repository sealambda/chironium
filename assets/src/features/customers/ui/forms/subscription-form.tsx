import { useForm } from "@tanstack/react-form";

import * as m from "@/paraglide/messages";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { createFieldValidator } from "@/shared/utils/form-utils";

import { usePlans } from "../../hooks/use-plans";
import {
  defaultSubscriptionValues,
  type SubscriptionFormData,
  subscriptionFormSchema,
} from "../../model/detail-schemas";
import { DatePickerField } from "../date-picker-field";
import { PlanDurationSelect } from "../plan-duration-select";

interface SubscriptionFormProps {
  id: string;
  onSubmit: (data: SubscriptionFormData) => void;
}

const planIdValidator = createFieldValidator(subscriptionFormSchema.shape.planId);

export function SubscriptionForm({ id, onSubmit }: Readonly<SubscriptionFormProps>) {
  const { data: plans = [] } = usePlans();

  const form = useForm({
    defaultValues: defaultSubscriptionValues,
    onSubmit: async ({ value }) => {
      const result = subscriptionFormSchema.safeParse(value);
      if (!result.success) {
        return;
      }
      onSubmit(value);
    },
  });

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-6 pt-4"
    >
      <FieldGroup>
        <form.Field name="startDate">
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_start_date()} <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <DatePickerField
                  value={field.state.value}
                  onChange={(date) => field.handleChange(date ?? new Date())}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="planId" validators={{ onBlur: planIdValidator }}>
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_plan_duration()} <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <PlanDurationSelect
                  plans={plans}
                  value={field.state.value}
                  onChange={field.handleChange}
                  className="w-full"
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </form>
  );
}
