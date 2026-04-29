import { useForm } from "@tanstack/react-form";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { useState } from "react";

import type { AnthropometryFormData } from "@/features/customers/api/anthropometry-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils/utils";

import { StepLayout } from "./step-layout";

interface AnthropometryStepProps {
  readonly initialData?: AnthropometryFormData;
  readonly onSubmit: (data: AnthropometryFormData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: AnthropometryFormData) => void;
}

const HARD_LIMITS: Record<string, { min: number; max: number; message: () => string }> = {
  weightKg: { min: 15, max: 650, message: () => m.validation_weight_range() },
  heightCm: { min: 50, max: 300, message: () => m.validation_height_range() },
  chestCm: { min: 40, max: 300, message: () => m.validation_chest_range() },
  waistCm: { min: 30, max: 350, message: () => m.validation_waist_range() },
  hipCm: { min: 40, max: 300, message: () => m.validation_hip_range() },
  armCm: { min: 10, max: 100, message: () => m.validation_arm_range() },
  thighCm: { min: 15, max: 150, message: () => m.validation_thigh_range() },
};

function makeFieldValidator(fieldName: string) {
  const validate = ({ value }: { value: string }) => {
    if (!value) {
      return undefined;
    }
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) {
      return m.validation_positive_number();
    }
    const limits = HARD_LIMITS[fieldName];
    if (limits && (num < limits.min || num > limits.max)) {
      return limits.message();
    }
    return undefined;
  };
  return { onSubmit: validate, onBlur: validate };
}

const SOFT_LIMITS: Record<string, { min: number; max: number }> = {
  weightKg: { min: 35, max: 250 },
  heightCm: { min: 130, max: 215 },
  chestCm: { min: 75, max: 150 },
  waistCm: { min: 60, max: 150 },
  hipCm: { min: 75, max: 160 },
  armCm: { min: 20, max: 55 },
  thighCm: { min: 40, max: 85 },
};

function getSoftWarning(fieldName: string, value: number): boolean {
  const limits = SOFT_LIMITS[fieldName];
  if (!limits || !value) {
    return false;
  }
  return value < limits.min || value > limits.max;
}

function NumberField({
  field,
  label,
  placeholder,
  fieldName,
}: {
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleChange: (v: string) => void;
    handleBlur: () => void;
  };
  label: string;
  placeholder: string;
  fieldName?: string;
}) {
  const numValue = field.state.value ? Number(field.state.value) : 0;

  const limits = fieldName ? HARD_LIMITS[fieldName] : undefined;

  const handleIncrement = () => {
    let newVal = Math.round((numValue + 0.5) * 10) / 10;
    if (limits) {
      newVal = Math.min(newVal, limits.max);
    }
    field.handleChange(String(newVal));
  };

  const handleDecrement = () => {
    const newVal = Math.max(0, Math.round((numValue - 0.5) * 10) / 10);
    field.handleChange(newVal > 0 ? String(newVal) : "");
  };

  const softWarning =
    fieldName && field.state.value ? getSoftWarning(fieldName, Number(field.state.value)) : false;

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
          className="appearance-none pr-9 pl-9 text-center"
        />
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!field.state.value || numValue <= 0}
          className="absolute inset-y-0 left-0 flex cursor-pointer items-center px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label={m.common_decrease_field({ field: label })}
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleIncrement}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-2.5 text-muted-foreground hover:text-foreground"
          aria-label={m.common_increase_field({ field: label })}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {field.state.meta.errors.length > 0 ? (
        <FieldError
          errors={
            field.state.meta.errors.map((e) =>
              typeof e === "string" ? { message: e } : e,
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

/**
 * Capture height, weight, and circumference measurements.
 * All fields are optional — the user can skip this step.
 */
export function AnthropometryStep({
  initialData,
  onSubmit,
  onBack,
  onSaveDraft,
}: AnthropometryStepProps) {
  const hasSecondaryData = Boolean(
    initialData?.chestCm ||
      initialData?.waistCm ||
      initialData?.hipCm ||
      initialData?.armCm ||
      initialData?.thighCm,
  );
  const [showMore, setShowMore] = useState(hasSecondaryData);

  const form = useForm({
    defaultValues: {
      heightCm: initialData?.heightCm?.toString() ?? "",
      weightKg: initialData?.weightKg?.toString() ?? "",
      chestCm: initialData?.chestCm?.toString() ?? "",
      waistCm: initialData?.waistCm?.toString() ?? "",
      hipCm: initialData?.hipCm?.toString() ?? "",
      armCm: initialData?.armCm?.toString() ?? "",
      thighCm: initialData?.thighCm?.toString() ?? "",
    },
    onSubmit: ({ value }) => {
      const toNum = (v: string) => (v && Number(v) > 0 ? Number(v) : null);
      onSubmit({
        heightCm: toNum(value.heightCm),
        weightKg: toNum(value.weightKg),
        chestCm: toNum(value.chestCm),
        waistCm: toNum(value.waistCm),
        hipCm: toNum(value.hipCm),
        armCm: toNum(value.armCm),
        thighCm: toNum(value.thighCm),
      });
    },
  });

  const handleBack = () => {
    const v = form.state.values;
    const toNum = (val: string) => (val && Number(val) > 0 ? Number(val) : null);
    onSaveDraft?.({
      heightCm: toNum(v.heightCm),
      weightKg: toNum(v.weightKg),
      chestCm: toNum(v.chestCm),
      waistCm: toNum(v.waistCm),
      hipCm: toNum(v.hipCm),
      armCm: toNum(v.armCm),
      thighCm: toNum(v.thighCm),
    });
    onBack();
  };

  return (
    <StepLayout
      title={m.step_anthropometry_title()}
      description={m.step_anthropometry_desc()}
      onSubmit={() => form.handleSubmit()}
      onBack={handleBack}
    >
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <form.Field name="weightKg" validators={makeFieldValidator("weightKg")}>
            {(field) => (
              <NumberField
                field={field}
                label={m.field_weight_kg()}
                placeholder={m.field_weight_placeholder()}
                fieldName="weightKg"
              />
            )}
          </form.Field>
          <form.Field name="heightCm" validators={makeFieldValidator("heightCm")}>
            {(field) => (
              <NumberField
                field={field}
                label={m.field_height_cm()}
                placeholder={m.field_height_placeholder()}
                fieldName="heightCm"
              />
            )}
          </form.Field>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-muted-foreground"
          onClick={() => setShowMore((v) => !v)}
        >
          <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} />
          {showMore ? m.anthropometry_show_less() : m.anthropometry_show_more()}
        </Button>

        {showMore ? (
          <>
            <div className="mx-auto w-full max-w-xs">
              <form.Field name="chestCm" validators={makeFieldValidator("chestCm")}>
                {(field) => (
                  <NumberField
                    field={field}
                    label={m.field_chest_cm()}
                    placeholder={m.field_chest_placeholder()}
                    fieldName="chestCm"
                  />
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="waistCm" validators={makeFieldValidator("waistCm")}>
                {(field) => (
                  <NumberField
                    field={field}
                    label={m.field_waist_cm()}
                    placeholder={m.field_waist_placeholder()}
                    fieldName="waistCm"
                  />
                )}
              </form.Field>
              <form.Field name="hipCm" validators={makeFieldValidator("hipCm")}>
                {(field) => (
                  <NumberField
                    field={field}
                    label={m.field_hip_cm()}
                    placeholder={m.field_hip_placeholder()}
                    fieldName="hipCm"
                  />
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="armCm" validators={makeFieldValidator("armCm")}>
                {(field) => (
                  <NumberField
                    field={field}
                    label={m.field_arm_cm()}
                    placeholder={m.field_arm_placeholder()}
                    fieldName="armCm"
                  />
                )}
              </form.Field>
              <form.Field name="thighCm" validators={makeFieldValidator("thighCm")}>
                {(field) => (
                  <NumberField
                    field={field}
                    label={m.field_thigh_cm()}
                    placeholder={m.field_thigh_placeholder()}
                    fieldName="thighCm"
                  />
                )}
              </form.Field>
            </div>
          </>
        ) : null}
      </FieldGroup>
    </StepLayout>
  );
}
