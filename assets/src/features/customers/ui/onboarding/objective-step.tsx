import { useForm } from "@tanstack/react-form";

import { objectiveSchema } from "@/features/customers/model/onboarding-schemas";
import * as m from "@/paraglide/messages";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface ObjectiveStepProps {
  readonly initialData?: string;
  readonly onSubmit: (note: string) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (note: string) => void;
}

/**
 * Capture the customer's main health or fitness objective (creates an active Goal record).
 */
export function ObjectiveStep({ initialData, onSubmit, onBack, onSaveDraft }: ObjectiveStepProps) {
  const form = useForm({
    defaultValues: { objective: initialData ?? "" },
    validators: { onSubmit: objectiveSchema },
    onSubmit: ({ value }) => {
      onSubmit(value.objective.trim());
    },
  });

  const handleBack = () => {
    onSaveDraft?.(form.state.values.objective);
    onBack();
  };

  return (
    <StepLayout
      title={m.step_objective_title()}
      description={m.step_objective_desc()}
      onSubmit={() => form.handleSubmit()}
      onBack={handleBack}
    >
      <FieldGroup>
        <form.Field
          name="objective"
          validators={{
            onBlur: ({ value }) => {
              if (!value || !value.trim()) {
                return m.validation_objective_required();
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel required>{m.field_objective()}</FieldLabel>
              <Textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={m.field_objective_placeholder()}
                rows={4}
                aria-invalid={field.state.meta.errors.length > 0}
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
      </FieldGroup>
    </StepLayout>
  );
}
