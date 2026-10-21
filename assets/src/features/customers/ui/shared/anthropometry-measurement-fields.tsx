import type { AnyFieldApi } from "@tanstack/react-form";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { NumberStepperInput } from "@/shared/ui/number-stepper-input";
import { cn } from "@/shared/utils/utils";

export interface AnthropometryMeasurementValues {
  weightKg: string;
  heightCm: string;
  chestCm: string;
  waistCm: string;
  hipCm: string;
  armCm: string;
  thighCm: string;
}

export interface AnthropometryMeasurementInput {
  weightKg: number | null;
  heightCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
}

type AnthropometryMeasurementFieldName = keyof AnthropometryMeasurementValues;

const ANTHROPOMETRY_MEASUREMENT_FIELD_NAMES = [
  "weightKg",
  "heightCm",
  "chestCm",
  "waistCm",
  "hipCm",
  "armCm",
  "thighCm",
] as const satisfies readonly AnthropometryMeasurementFieldName[];

const ADVANCED_ANTHROPOMETRY_FIELD_NAMES = [
  "chestCm",
  "waistCm",
  "hipCm",
  "armCm",
  "thighCm",
] as const satisfies readonly AnthropometryMeasurementFieldName[];

const SOFT_LIMITS: Record<AnthropometryMeasurementFieldName, { min: number; max: number }> = {
  weightKg: { min: 35, max: 250 },
  heightCm: { min: 130, max: 215 },
  chestCm: { min: 75, max: 150 },
  waistCm: { min: 60, max: 150 },
  hipCm: { min: 75, max: 160 },
  armCm: { min: 20, max: 55 },
  thighCm: { min: 40, max: 85 },
};

const HARD_LIMITS: Record<
  AnthropometryMeasurementFieldName,
  { min: number; max: number; message: () => string }
> = {
  weightKg: { min: 15, max: 650, message: () => m.validation_weight_range() },
  heightCm: { min: 50, max: 300, message: () => m.validation_height_range() },
  chestCm: { min: 40, max: 300, message: () => m.validation_chest_range() },
  waistCm: { min: 30, max: 350, message: () => m.validation_waist_range() },
  hipCm: { min: 40, max: 300, message: () => m.validation_hip_range() },
  armCm: { min: 10, max: 100, message: () => m.validation_arm_range() },
  thighCm: { min: 15, max: 150, message: () => m.validation_thigh_range() },
};

const FIELD_COPY: Record<
  AnthropometryMeasurementFieldName,
  { label: () => string; placeholder: () => string }
> = {
  weightKg: {
    label: m.field_weight_kg,
    placeholder: m.field_weight_placeholder,
  },
  heightCm: {
    label: m.field_height_cm,
    placeholder: m.field_height_placeholder,
  },
  chestCm: { label: m.field_chest_cm, placeholder: m.field_chest_placeholder },
  waistCm: { label: m.field_waist_cm, placeholder: m.field_waist_placeholder },
  hipCm: { label: m.field_hip_cm, placeholder: m.field_hip_placeholder },
  armCm: { label: m.field_arm_cm, placeholder: m.field_arm_placeholder },
  thighCm: { label: m.field_thigh_cm, placeholder: m.field_thigh_placeholder },
};

interface AnthropometryMeasurementFormApi {
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

interface NumericInputFieldProps {
  field: AnyFieldApi;
  fieldName: AnthropometryMeasurementFieldName;
  withSteppers: boolean;
}

function getAnthropometrySoftWarning(
  fieldName: AnthropometryMeasurementFieldName,
  value: number,
): boolean {
  const limits = SOFT_LIMITS[fieldName];
  if (!value) {
    return false;
  }
  return value < limits.min || value > limits.max;
}

function makeAnthropometryFieldValidator(fieldName: AnthropometryMeasurementFieldName) {
  const validate = ({ value }: { value: string }) => {
    if (!value) {
      return undefined;
    }
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) {
      return m.validation_positive_number();
    }
    const limits = HARD_LIMITS[fieldName];
    if (num < limits.min || num > limits.max) {
      return limits.message();
    }
    return undefined;
  };
  return { onSubmit: validate, onBlur: validate };
}

function toFieldErrors(errors: readonly unknown[]): Array<{ message?: string } | undefined> {
  return errors.map((error) => (typeof error === "string" ? { message: error } : error)) as Array<
    { message?: string } | undefined
  >;
}

function NumericInputField({ field, fieldName, withSteppers }: Readonly<NumericInputFieldProps>) {
  const { label, placeholder } = FIELD_COPY[fieldName];
  const labelText = label();
  const value = String(field.state.value ?? "");
  const hardLimits = HARD_LIMITS[fieldName];
  const softWarning = value ? getAnthropometrySoftWarning(fieldName, Number(value)) : false;
  const hasErrors = field.state.meta.errors.length > 0;

  return (
    <Field data-invalid={hasErrors}>
      <FieldLabel>{labelText}</FieldLabel>
      {withSteppers ? (
        <NumberStepperInput
          value={value}
          onValueChange={field.handleChange}
          onBlur={field.handleBlur}
          placeholder={placeholder()}
          aria-invalid={hasErrors}
          min={0}
          max={hardLimits.max}
          step={0.5}
          clearValueOnMin
          decrementLabel={m.common_decrease_field({ field: labelText })}
          incrementLabel={m.common_increase_field({ field: labelText })}
        />
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          value={value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder()}
          aria-invalid={hasErrors}
          className="text-center"
        />
      )}
      {hasErrors ? <FieldError errors={toFieldErrors(field.state.meta.errors)} /> : null}
      {softWarning ? (
        <p className="text-xs text-warning-muted-foreground">{m.validation_unusual_value()}</p>
      ) : null}
    </Field>
  );
}

function toNumberInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function valueToAnthropometryInput(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

export function buildAnthropometryMeasurementValues(
  values?: Partial<AnthropometryMeasurementInput> | null,
): AnthropometryMeasurementValues {
  return {
    weightKg: valueToAnthropometryInput(values?.weightKg),
    heightCm: valueToAnthropometryInput(values?.heightCm),
    chestCm: valueToAnthropometryInput(values?.chestCm),
    waistCm: valueToAnthropometryInput(values?.waistCm),
    hipCm: valueToAnthropometryInput(values?.hipCm),
    armCm: valueToAnthropometryInput(values?.armCm),
    thighCm: valueToAnthropometryInput(values?.thighCm),
  };
}

export function toAnthropometryMeasurementInput(
  values: AnthropometryMeasurementValues,
): AnthropometryMeasurementInput {
  return {
    weightKg: toNumberInput(values.weightKg),
    heightCm: toNumberInput(values.heightCm),
    chestCm: toNumberInput(values.chestCm),
    waistCm: toNumberInput(values.waistCm),
    hipCm: toNumberInput(values.hipCm),
    armCm: toNumberInput(values.armCm),
    thighCm: toNumberInput(values.thighCm),
  };
}

export function hasAnthropometryMeasurementValues(input: AnthropometryMeasurementInput): boolean {
  return ANTHROPOMETRY_MEASUREMENT_FIELD_NAMES.some((fieldName) => input[fieldName] !== null);
}

export function hasAdvancedAnthropometryMeasurementValues(
  input?: Partial<AnthropometryMeasurementInput> | null,
): boolean {
  return ADVANCED_ANTHROPOMETRY_FIELD_NAMES.some((fieldName) => input?.[fieldName] != null);
}

interface MeasurementFieldProps {
  form: AnthropometryMeasurementFormApi;
  fieldName: AnthropometryMeasurementFieldName;
  withSteppers: boolean;
  validators?: ReturnType<typeof makeAnthropometryFieldValidator>;
}

function MeasurementField({
  form,
  fieldName,
  withSteppers,
  validators,
}: Readonly<MeasurementFieldProps>) {
  return (
    <form.Field name={fieldName} validators={validators}>
      {(field: AnyFieldApi) => (
        <NumericInputField field={field} fieldName={fieldName} withSteppers={withSteppers} />
      )}
    </form.Field>
  );
}

interface AnthropometryMeasurementFieldsProps {
  form: AnthropometryMeasurementFormApi;
  withSteppers: boolean;
  withValidation: boolean;
  initialShowMore?: boolean;
}

export function AnthropometryMeasurementFields({
  form,
  withSteppers,
  withValidation,
  initialShowMore = false,
}: Readonly<AnthropometryMeasurementFieldsProps>) {
  const [showMore, setShowMore] = useState(initialShowMore);
  const getValidators = (fieldName: AnthropometryMeasurementFieldName) =>
    withValidation ? makeAnthropometryFieldValidator(fieldName) : undefined;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <MeasurementField
          form={form}
          fieldName="weightKg"
          withSteppers={withSteppers}
          validators={getValidators("weightKg")}
        />
        <MeasurementField
          form={form}
          fieldName="heightCm"
          withSteppers={withSteppers}
          validators={getValidators("heightCm")}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full gap-1.5 text-muted-foreground"
        onClick={() => setShowMore((value) => !value)}
      >
        <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} />
        {showMore ? m.anthropometry_show_less() : m.anthropometry_show_more()}
      </Button>

      {showMore ? (
        <>
          <div
            className={cn("grid gap-4", withSteppers ? "mx-auto w-full max-w-xs" : "grid-cols-2")}
          >
            <MeasurementField
              form={form}
              fieldName="chestCm"
              withSteppers={withSteppers}
              validators={getValidators("chestCm")}
            />
            {withSteppers ? null : (
              <MeasurementField
                form={form}
                fieldName="waistCm"
                withSteppers={withSteppers}
                validators={getValidators("waistCm")}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {withSteppers ? (
              <MeasurementField
                form={form}
                fieldName="waistCm"
                withSteppers={withSteppers}
                validators={getValidators("waistCm")}
              />
            ) : null}
            <MeasurementField
              form={form}
              fieldName="hipCm"
              withSteppers={withSteppers}
              validators={getValidators("hipCm")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MeasurementField
              form={form}
              fieldName="armCm"
              withSteppers={withSteppers}
              validators={getValidators("armCm")}
            />
            <MeasurementField
              form={form}
              fieldName="thighCm"
              withSteppers={withSteppers}
              validators={getValidators("thighCm")}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
