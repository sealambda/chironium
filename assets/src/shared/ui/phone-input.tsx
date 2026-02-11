import type { CountryCode } from "libphonenumber-js";
import { Globe } from "lucide-react";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import {
  analyzePhoneNumber,
  formatPhoneDisplay,
  getCountryFlag,
  type PhoneAnalysis,
  type PhoneValidationStatus,
  sanitizePhoneInput,
  toE164,
} from "@/shared/utils/phone-utils";

export interface PhoneInputProps
  extends Omit<ComponentProps<"input">, "value" | "onChange" | "type"> {
  /**
   * Phone value in E.164 format (e.g., "+34612345678").
   * The component displays this formatted in INTERNATIONAL format.
   */
  value: string;

  /** Receives the value in E.164 format. */
  onChange: (value: string) => void;

  onBlur?: () => void;

  /**
   * Default country code for placeholder formatting.
   * Does not restrict input to this country.
   * @default "ES" (Spain)
   */
  defaultCountry?: CountryCode;

  /**
   * Placeholder text. Defaults to formatted example for defaultCountry.
   */
  placeholder?: string;

  /**
   * Optional callback for validation status changes.
   * Useful for showing real-time validation feedback.
   */
  onValidationChange?: (status: PhoneValidationStatus, analysis: PhoneAnalysis) => void;

  "aria-invalid"?: boolean;
}

/**
 * International phone input with country detection, flag display, and E.164 storage.
 *
 * @example
 * <PhoneInput
 *   value={phone}
 *   onChange={setPhone}
 *   onValidationChange={(status) => setIsValid(status === "valid")}
 * />
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  defaultCountry: _defaultCountry = "ES",
  placeholder,
  onValidationChange,
  disabled,
  ...props
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatPhoneDisplay(value));
  const [detectedCountry, setDetectedCountry] = useState<CountryCode | undefined>(
    () => analyzePhoneNumber(value).country,
  );
  const previousValueRef = useRef(value);

  // Sync display when external value changes.
  useEffect(() => {
    const formatted = formatPhoneDisplay(value);
    const analysis = analyzePhoneNumber(value);
    setDisplayValue(formatted);
    setDetectedCountry(analysis.country);
    previousValueRef.current = value;
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const { value: sanitized } = sanitizePhoneInput(raw, previousValueRef.current);
      const analysis = analyzePhoneNumber(sanitized);

      setDisplayValue(analysis.formatted);
      setDetectedCountry(analysis.country);

      const e164Value = toE164(sanitized);
      previousValueRef.current = e164Value;
      onChange(e164Value);

      onValidationChange?.(analysis.status, analysis);
    },
    [onChange, onValidationChange],
  );

  const handleBlur = useCallback(() => {
    // Re-format on blur to ensure clean display.
    setDisplayValue(formatPhoneDisplay(value));
    onBlur?.();
  }, [value, onBlur]);

  const defaultPlaceholder = placeholder ?? "+34 600 000 000";
  const FlagComponent = useMemo(() => getCountryFlag(detectedCountry), [detectedCountry]);

  return (
    <InputGroup data-disabled={disabled}>
      <InputGroupAddon align="inline-start" className="w-8 pl-2.5">
        {FlagComponent ? (
          <FlagComponent
            className="h-4 w-6 overflow-hidden rounded-sm"
            aria-label={`Flag of ${detectedCountry}`}
          />
        ) : (
          <Globe className="size-5 text-muted-foreground/50" aria-label="No country detected" />
        )}
      </InputGroupAddon>
      <InputGroupInput
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={defaultPlaceholder}
        disabled={disabled}
        {...props}
      />
    </InputGroup>
  );
}

export type { PhoneValidationStatus, PhoneAnalysis, CountryCode };
