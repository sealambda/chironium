import { Minus, Plus } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/utils/utils";

import { Input } from "./input";

type NumberInputProps = Omit<
  React.ComponentProps<"input">,
  "className" | "defaultValue" | "max" | "min" | "onChange" | "step" | "type" | "value"
>;

export interface NumberStepperInputProps extends NumberInputProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly decrementLabel: string;
  readonly incrementLabel: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly clearValueOnMin?: boolean;
  readonly className?: string;
  readonly inputClassName?: string;
}

function getDecimalPlaces(value: number): number {
  const text = value.toString().toLowerCase();
  if (!text.includes("e-")) {
    return text.split(".")[1]?.length ?? 0;
  }

  const [, exponent = "0"] = text.split("e-");
  return Number(exponent) || 0;
}

function toFiniteNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min?: number, max?: number): number {
  let nextValue = value;
  if (min !== undefined) {
    nextValue = Math.max(nextValue, min);
  }
  if (max !== undefined) {
    nextValue = Math.min(nextValue, max);
  }
  return nextValue;
}

function formatValue(value: number, step: number, currentValue: number | null): string {
  const precision = Math.min(
    Math.max(getDecimalPlaces(step), currentValue === null ? 0 : getDecimalPlaces(currentValue)),
    10,
  );
  return String(Number(value.toFixed(precision)));
}

export function NumberStepperInput({
  value,
  onValueChange,
  decrementLabel,
  incrementLabel,
  min,
  max,
  step = 1,
  clearValueOnMin = false,
  className,
  inputClassName,
  inputMode = "decimal",
  disabled,
  readOnly,
  ...inputProps
}: NumberStepperInputProps) {
  const stepValue = Number.isFinite(step) && step > 0 ? step : 1;
  const currentValue = toFiniteNumber(value);
  const controlsDisabled = disabled || readOnly;
  const canDecrement =
    !controlsDisabled && currentValue !== null && (min === undefined || currentValue > min);
  const canIncrement =
    !controlsDisabled && (currentValue === null || max === undefined || currentValue < max);

  const handleDecrement = () => {
    if (!canDecrement || currentValue === null) {
      return;
    }

    const nextValue = clamp(currentValue - stepValue, min, max);
    if (clearValueOnMin && min !== undefined && nextValue <= min) {
      onValueChange("");
      return;
    }

    onValueChange(formatValue(nextValue, stepValue, currentValue));
  };

  const handleIncrement = () => {
    if (!canIncrement) {
      return;
    }

    const nextValue = clamp((currentValue ?? 0) + stepValue, min, max);
    onValueChange(formatValue(nextValue, stepValue, currentValue));
  };

  return (
    <div className={cn("relative", className)} data-slot="number-stepper-input">
      <Input
        {...inputProps}
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={stepValue}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        className={cn("no-native-number-spinner pr-9 pl-9 text-center", inputClassName)}
      />
      <button
        type="button"
        className="absolute inset-y-0 left-0 flex w-9 cursor-pointer items-center justify-center rounded-l-md text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30"
        onClick={handleDecrement}
        disabled={!canDecrement}
        aria-label={decrementLabel}
        data-slot="number-stepper-decrement"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30"
        onClick={handleIncrement}
        disabled={!canIncrement}
        aria-label={incrementLabel}
        data-slot="number-stepper-increment"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
