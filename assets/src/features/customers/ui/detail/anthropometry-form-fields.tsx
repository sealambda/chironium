import type { AnyFieldApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

import {
  AnthropometryMeasurementFields,
  type AnthropometryMeasurementInput,
  type AnthropometryMeasurementValues,
  hasAnthropometryMeasurementValues,
  toAnthropometryMeasurementInput,
} from "@/features/customers/ui/shared/anthropometry-measurement-fields";
import * as m from "@/paraglide/messages";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export interface AnthropometryFormValues extends AnthropometryMeasurementValues {
  effectiveDateTime: string;
  effectiveTime: string;
}

export interface AnthropometryValuesInput extends AnthropometryMeasurementInput {
  effectiveDate?: string | null;
  effectiveTime?: string | null;
}

interface AnthropometryFormApi {
  // TanStack Form's render helper receives field config plus a render function child.
  // This narrow shape avoids `any` while matching current usage.
  // biome-ignore lint/style/useNamingConvention: TanStack Form API uses the Field render helper.
  Field: (props: {
    name: string;
    validators?: {
      onSubmit: ({ value }: { value: string }) => string | undefined;
      onBlur: ({ value }: { value: string }) => string | undefined;
    };
    children: (field: AnyFieldApi) => ReactNode;
  }) => ReactNode | Promise<ReactNode>;
}

interface AnthropometryFormFieldsProps {
  form: AnthropometryFormApi;
  saving: boolean;
  withSteppers: boolean;
  withValidation: boolean;
  initialShowMore?: boolean;
  disableEffectiveDateTime?: boolean;
}

export function AnthropometryFormFields({
  form,
  saving,
  withSteppers,
  withValidation,
  initialShowMore = false,
  disableEffectiveDateTime = false,
}: Readonly<AnthropometryFormFieldsProps>) {
  return (
    <FieldGroup>
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="effectiveDateTime">
          {(field: AnyFieldApi) => (
            <Field>
              <FieldLabel>{m.anthropometry_date()}</FieldLabel>
              <DatePickerString
                value={field.state.value}
                onChange={(value) => field.handleChange(value)}
                disabled={saving || disableEffectiveDateTime}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="effectiveTime">
          {(field: AnyFieldApi) => (
            <Field>
              <FieldLabel>{m.common_time()}</FieldLabel>
              <Input
                type="time"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                disabled={saving || disableEffectiveDateTime}
              />
            </Field>
          )}
        </form.Field>
      </div>

      <AnthropometryMeasurementFields
        form={form}
        withSteppers={withSteppers}
        withValidation={withValidation}
        initialShowMore={initialShowMore}
      />
    </FieldGroup>
  );
}

export function toAnthropometryValuesInput(
  values: AnthropometryFormValues,
): AnthropometryValuesInput {
  return {
    effectiveDate: values.effectiveDateTime,
    effectiveTime: values.effectiveTime,
    ...toAnthropometryMeasurementInput(values),
  };
}

export function hasAnthropometryValues(input: AnthropometryValuesInput): boolean {
  return hasAnthropometryMeasurementValues(input);
}
