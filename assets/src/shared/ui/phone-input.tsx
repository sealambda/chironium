import * as Flags from "country-flag-icons/react/3x2";
import type { CountryCode } from "libphonenumber-js";
import { Globe } from "lucide-react";
import {
  type ComponentProps,
  type FC,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui/input-group";
import {
  analyzePhoneNumber,
  formatPhoneDisplay,
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

  /**
   * Called when the phone value changes.
   * Receives the value in E.164 format (digits only with + prefix).
   */
  onChange: (value: string) => void;

  /**
   * Called on blur event.
   */
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
  onValidationChange?: (
    status: PhoneValidationStatus,
    analysis: PhoneAnalysis,
  ) => void;

  /**
   * Whether the input is in an invalid state (from form validation).
   */
  "aria-invalid"?: boolean;
}

/**
 * Get the flag component for a country code.
 * Returns undefined if no flag is available.
 */
function getFlag(
  countryCode: CountryCode | undefined,
): FC<SVGProps<SVGSVGElement>> | undefined {
  if (!countryCode) return undefined;
  return (Flags as Record<string, FC<SVGProps<SVGSVGElement>>>)[countryCode];
}

/**
 * International phone input with real-time validation and formatting.
 *
 * Features:
 * - Shows country flag when country is detected
 * - Auto-formats in INTERNATIONAL format as you type
 * - Detects country from prefix and limits digits accordingly
 * - Stores value in E.164 format
 * - Provides real-time validation feedback
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
  // Display value in INTERNATIONAL format.
  const [displayValue, setDisplayValue] = useState(() =>
    formatPhoneDisplay(value),
  );

  // Track detected country for flag display.
  const [detectedCountry, setDetectedCountry] = useState<
    CountryCode | undefined
  >(() => analyzePhoneNumber(value).country);

  // Track previous value for comparison.
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

      // Sanitize and check digit limits (truncates if too long for country).
      const { value: sanitized } = sanitizePhoneInput(
        raw,
        previousValueRef.current,
      );

      // Analyze for validation and formatting.
      const analysis = analyzePhoneNumber(sanitized);

      // Update display with INTERNATIONAL format.
      setDisplayValue(analysis.formatted);

      // Update detected country for flag.
      setDetectedCountry(analysis.country);

      // Store E.164 format.
      const e164Value = toE164(sanitized);
      previousValueRef.current = e164Value;
      onChange(e164Value);

      // Notify validation status.
      onValidationChange?.(analysis.status, analysis);
    },
    [onChange, onValidationChange],
  );

  const handleBlur = useCallback(() => {
    // Re-format on blur to ensure clean display.
    setDisplayValue(formatPhoneDisplay(value));
    onBlur?.();
  }, [value, onBlur]);

  // Generate placeholder based on default country.
  const defaultPlaceholder = placeholder ?? "+34 600 000 000";

  // Get the flag component for the detected country.
  const FlagComponent = useMemo(
    () => getFlag(detectedCountry),
    [detectedCountry],
  );

  return (
    <InputGroup data-disabled={disabled}>
      <InputGroupAddon align="inline-start" className="w-8 pl-2.5">
        {FlagComponent ? (
          <FlagComponent
            className="h-4 w-6 overflow-hidden rounded-sm"
            aria-label={`Flag of ${detectedCountry}`}
          />
        ) : (
          <Globe
            className="size-5 text-muted-foreground/50"
            aria-label="No country detected"
          />
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
