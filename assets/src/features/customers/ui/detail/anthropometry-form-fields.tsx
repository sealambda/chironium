import type { AnyFieldApi } from "@tanstack/react-form";
import { ChevronDown, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils/utils";

export interface AnthropometryFormValues {
  effectiveDateTime: string;
  effectiveTime: string;
  weightKg: string;
  heightCm: string;
  chestCm: string;
  waistCm: string;
  hipCm: string;
  armCm: string;
  thighCm: string;
}

export interface AnthropometryValuesInput {
  effectiveDate?: string | null;
  effectiveTime?: string | null;
  weightKg: number | null;
  heightCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
}

interface AnthropometryFormApi {
  Field: <TName extends keyof AnthropometryFormValues>(props: {
    name: TName;
    validators?: unknown;
    children: (field: AnyFieldApi) => ReactNode;
  }) => ReactNode;
}
type FieldName = keyof Omit<AnthropometryFormValues, "effectiveDateTime" | "effectiveTime">;

const SOFT_LIMITS: Record<FieldName, { min: number; max: number }> = {
  weightKg: { min: 35, max: 250 },
  heightCm: { min: 130, max: 215 },
  chestCm: { min: 75, max: 150 },
  waistCm: { min: 60, max: 150 },
  hipCm: { min: 75, max: 160 },
  armCm: { min: 20, max: 55 },
  thighCm: { min: 40, max: 85 },
};

const HARD_LIMITS: Record<FieldName, { min: number; max: number; message: () => string }> = {
  weightKg: { min: 15, max: 650, message: () => m.validation_weight_range() },
  heightCm: { min: 50, max: 300, message: () => m.validation_height_range() },
  chestCm: { min: 40, max: 300, message: () => m.validation_chest_range() },
  waistCm: { min: 30, max: 350, message: () => m.validation_waist_range() },
  hipCm: { min: 40, max: 300, message: () => m.validation_hip_range() },
  armCm: { min: 10, max: 100, message: () => m.validation_arm_range() },
  thighCm: { min: 15, max: 150, message: () => m.validation_thigh_range() },
};

interface NumericInputFieldProps {
  field: AnyFieldApi;
  label: string;
  placeholder: string;
  fieldName: FieldName;
  withSteppers: boolean;
}

function getSoftWarning(fieldName: FieldName, value: number): boolean {
  const limits = SOFT_LIMITS[fieldName];
  if (!value) {
    return false;
  }
  return value < limits.min || value > limits.max;
}

function makeFieldValidator(fieldName: FieldName) {
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
  return { onSubmit: validate };
}

function NumericInputField({
  field,
  label,
  placeholder,
  fieldName,
  withSteppers,
}: Readonly<NumericInputFieldProps>) {
  const numValue = field.state.value ? Number(field.state.value) : 0;
  const hardLimits = HARD_LIMITS[fieldName];
  const softWarning = field.state.value
    ? getSoftWarning(fieldName, Number(field.state.value))
    : false;

  const handleIncrement = () => {
    if (!withSteppers) {
      return;
    }
    const newValue = Math.min(Math.round((numValue + 0.5) * 10) / 10, hardLimits.max);
    field.handleChange(String(newValue));
  };

  const handleDecrement = () => {
    if (!withSteppers) {
      return;
    }
    const newValue = Math.max(0, Math.round((numValue - 0.5) * 10) / 10);
    field.handleChange(newValue > 0 ? String(newValue) : "");
  };

  return (
    <Field data-invalid={field.state.meta.errors.length > 0}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.5"
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          aria-invalid={field.state.meta.errors.length > 0}
          className={cn(
            "text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            withSteppers ? "pr-9 pl-9" : undefined,
          )}
        />
        {withSteppers ? (
          <>
            <button
              type="button"
              onClick={handleDecrement}
              disabled={!field.state.value || numValue <= 0}
              className="absolute inset-y-0 left-0 flex cursor-pointer items-center px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleIncrement}
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          </>
        ) : null}
      </div>
      {field.state.meta.errors.length > 0 ? (
        <FieldError
          errors={
            field.state.meta.errors.map((error) =>
              typeof error === "string" ? { message: error } : error,
            ) as Array<{ message?: string } | undefined>
          }
        />
      ) : null}
      {softWarning ? (
        <p className="text-amber-600 text-xs">{m.validation_unusual_value()}</p>
      ) : null}
    </Field>
  );
}

interface AnthropometryFormFieldsProps {
  form: AnthropometryFormApi;
  saving: boolean;
  withSteppers: boolean;
  withValidation: boolean;
  initialShowMore?: boolean;
}

export function AnthropometryFormFields({
  form,
  saving,
  withSteppers,
  withValidation,
  initialShowMore = false,
}: Readonly<AnthropometryFormFieldsProps>) {
  const [showMore, setShowMore] = useState(initialShowMore);
  const getValidators = (fieldName: FieldName) =>
    withValidation ? makeFieldValidator(fieldName) : undefined;

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
                disabled={saving}
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
                disabled={saving}
              />
            </Field>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="weightKg" validators={getValidators("weightKg")}>
          {(field: AnyFieldApi) => (
            <NumericInputField
              field={field}
              label={m.field_weight_kg()}
              placeholder={m.field_weight_placeholder()}
              fieldName="weightKg"
              withSteppers={withSteppers}
            />
          )}
        </form.Field>
        <form.Field name="heightCm" validators={getValidators("heightCm")}>
          {(field: AnyFieldApi) => (
            <NumericInputField
              field={field}
              label={m.field_height_cm()}
              placeholder={m.field_height_placeholder()}
              fieldName="heightCm"
              withSteppers={withSteppers}
            />
          )}
        </form.Field>
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
            className={cn(
              "grid gap-4",
              withSteppers ? "mx-auto w-full max-w-[calc(50%-0.5rem)]" : "grid-cols-2",
            )}
          >
            <form.Field name="chestCm" validators={getValidators("chestCm")}>
              {(field: AnyFieldApi) => (
                <NumericInputField
                  field={field}
                  label={m.field_chest_cm()}
                  placeholder={m.field_chest_placeholder()}
                  fieldName="chestCm"
                  withSteppers={withSteppers}
                />
              )}
            </form.Field>
            {!withSteppers ? (
              <form.Field name="waistCm" validators={getValidators("waistCm")}>
                {(field: AnyFieldApi) => (
                  <NumericInputField
                    field={field}
                    label={m.field_waist_cm()}
                    placeholder={m.field_waist_placeholder()}
                    fieldName="waistCm"
                    withSteppers={withSteppers}
                  />
                )}
              </form.Field>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {withSteppers ? (
              <form.Field name="waistCm" validators={getValidators("waistCm")}>
                {(field: AnyFieldApi) => (
                  <NumericInputField
                    field={field}
                    label={m.field_waist_cm()}
                    placeholder={m.field_waist_placeholder()}
                    fieldName="waistCm"
                    withSteppers={withSteppers}
                  />
                )}
              </form.Field>
            ) : null}
            <form.Field name="hipCm" validators={getValidators("hipCm")}>
              {(field: AnyFieldApi) => (
                <NumericInputField
                  field={field}
                  label={m.field_hip_cm()}
                  placeholder={m.field_hip_placeholder()}
                  fieldName="hipCm"
                  withSteppers={withSteppers}
                />
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="armCm" validators={getValidators("armCm")}>
              {(field: AnyFieldApi) => (
                <NumericInputField
                  field={field}
                  label={m.field_arm_cm()}
                  placeholder={m.field_arm_placeholder()}
                  fieldName="armCm"
                  withSteppers={withSteppers}
                />
              )}
            </form.Field>
            <form.Field name="thighCm" validators={getValidators("thighCm")}>
              {(field: AnyFieldApi) => (
                <NumericInputField
                  field={field}
                  label={m.field_thigh_cm()}
                  placeholder={m.field_thigh_placeholder()}
                  fieldName="thighCm"
                  withSteppers={withSteppers}
                />
              )}
            </form.Field>
          </div>
        </>
      ) : null}
    </FieldGroup>
  );
}

export function toAnthropometryValuesInput(
  values: AnthropometryFormValues,
): AnthropometryValuesInput {
  const toNum = (value: string) => {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  };

  return {
    effectiveDate: values.effectiveDateTime,
    effectiveTime: values.effectiveTime,
    weightKg: toNum(values.weightKg),
    heightCm: toNum(values.heightCm),
    chestCm: toNum(values.chestCm),
    waistCm: toNum(values.waistCm),
    hipCm: toNum(values.hipCm),
    armCm: toNum(values.armCm),
    thighCm: toNum(values.thighCm),
  };
}

export function hasAnthropometryValues(input: AnthropometryValuesInput): boolean {
  return (
    input.weightKg !== null ||
    input.heightCm !== null ||
    input.chestCm !== null ||
    input.waistCm !== null ||
    input.hipCm !== null ||
    input.armCm !== null ||
    input.thighCm !== null
  );
}
