import type { CountryCode } from "libphonenumber-js";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { ChevronDown, Globe } from "lucide-react";
import {
  type ComponentProps,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  analyzePhoneNumber,
  getCountryFlag,
  type PhoneAnalysis,
  type PhoneValidationStatus,
  sanitizePhoneInput,
  toE164,
} from "@/shared/utils/phone-utils";
import { cn } from "@/shared/utils/utils";

// ─── Country list ───────────────────────────────────────────────────

interface CountryOption {
  code: CountryCode;
  callingCode: string;
}

const COUNTRY_OPTIONS: CountryOption[] = (() => {
  const countries = getCountries();
  return countries
    .map((code) => ({
      code,
      callingCode: getCountryCallingCode(code),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
})();

// Prioritized countries appear at the top of the list.
const PRIORITY_COUNTRIES: CountryCode[] = ["ES", "US", "GB", "MX", "AR", "CO", "CL"];

function getSortedOptions(): CountryOption[] {
  const prioritized = PRIORITY_COUNTRIES.map((code) =>
    COUNTRY_OPTIONS.find((o) => o.code === code),
  ).filter((o): o is CountryOption => o !== undefined);
  const rest = COUNTRY_OPTIONS.filter((o) => !PRIORITY_COUNTRIES.includes(o.code));
  return [...prioritized, ...rest];
}

const sortedOptions = getSortedOptions();

// ─── Props ──────────────────────────────────────────────────────────

export interface PhoneInputProps
  extends Omit<ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
  onValidationChange?: (status: PhoneValidationStatus, analysis: PhoneAnalysis) => void;
  "aria-invalid"?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function PhoneInput({
  value,
  onChange,
  onBlur,
  defaultCountry = "ES",
  placeholder,
  onValidationChange,
  disabled,
  ...props
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    if (value) {
      const analysis = analyzePhoneNumber(value);
      return analysis.country ?? defaultCountry;
    }
    return defaultCountry;
  });

  const [nationalNumber, setNationalNumber] = useState(() => {
    if (value) {
      const parsed = parsePhoneNumberFromString(value);
      return parsed?.nationalNumber ?? value.replace(/^\+\d+/, "");
    }
    return "";
  });

  const previousValueRef = useRef(value);
  const previousRawRef = useRef("");

  // Sync when external value changes (e.g., back-navigation restoring draft).
  useEffect(() => {
    if (value === previousValueRef.current) {
      return;
    }
    previousValueRef.current = value;

    if (!value) {
      setNationalNumber("");
      return;
    }

    const parsed = parsePhoneNumberFromString(value);
    if (parsed) {
      setSelectedCountry(parsed.country ?? defaultCountry);
      setNationalNumber(parsed.nationalNumber ?? "");
    }
  }, [value, defaultCountry]);

  const callingCode = useMemo(() => getCountryCallingCode(selectedCountry), [selectedCountry]);

  const FlagComponent = useMemo(() => getCountryFlag(selectedCountry), [selectedCountry]);

  const emitChange = useCallback(
    (country: CountryCode, national: string) => {
      if (!national) {
        previousValueRef.current = "";
        onChange("");
        return;
      }
      const full = `+${getCountryCallingCode(country)}${national.replace(/\D/g, "")}`;
      const e164 = toE164(full);
      previousValueRef.current = e164;
      onChange(e164);

      const analysis = analyzePhoneNumber(e164);
      onValidationChange?.(analysis.status, analysis);
    },
    [onChange, onValidationChange],
  );

  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!countrySearch.trim()) {
      return sortedOptions;
    }
    const q = countrySearch.toLowerCase();
    return sortedOptions.filter(
      (o) => o.code.toLowerCase().includes(q) || o.callingCode.includes(q),
    );
  }, [countrySearch]);

  const handleCountryChange = useCallback(
    (country: CountryCode) => {
      setSelectedCountry(country);
      emitChange(country, nationalNumber);
      setCountryOpen(false);
      setCountrySearch("");
    },
    [nationalNumber, emitChange],
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawDigits = e.target.value.replace(/\D/g, "");

      // Build full E.164-style string for sanitization
      const fullNumber = rawDigits ? `+${getCountryCallingCode(selectedCountry)}${rawDigits}` : "";
      const previousFull = previousRawRef.current
        ? `+${getCountryCallingCode(selectedCountry)}${previousRawRef.current}`
        : "";

      const { value: sanitized } = sanitizePhoneInput(fullNumber, previousFull);

      // Extract national part back from sanitized
      const callingCodeStr = getCountryCallingCode(selectedCountry);
      const sanitizedDigits = sanitized.replace(/\D/g, "");
      const national = sanitizedDigits.startsWith(callingCodeStr)
        ? sanitizedDigits.slice(callingCodeStr.length)
        : sanitizedDigits;

      previousRawRef.current = national;

      // Format national number using AsYouType
      const formatted = new AsYouType(selectedCountry).input(national);
      setNationalNumber(formatted);
      emitChange(selectedCountry, national);
    },
    [selectedCountry, emitChange],
  );

  const handleBlur = useCallback(() => {
    onBlur?.();
    if (nationalNumber) {
      const full = `+${callingCode}${nationalNumber.replace(/\D/g, "")}`;
      const analysis = analyzePhoneNumber(full);
      onValidationChange?.(analysis.status, analysis);
    }
  }, [onBlur, nationalNumber, callingCode, onValidationChange]);

  const defaultPlaceholder = useMemo(() => {
    if (placeholder) {
      return placeholder;
    }
    const example = getExampleNumber(selectedCountry, examples);
    if (example?.nationalNumber) {
      return new AsYouType(selectedCountry).input(example.nationalNumber);
    }
    return "600 000 000";
  }, [placeholder, selectedCountry]);

  return (
    <div className={cn("flex gap-2", disabled && "opacity-50")}>
      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              disabled={disabled}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm hover:bg-accent/50"
            />
          }
        >
          {FlagComponent ? (
            <FlagComponent className="h-3.5 w-5 shrink-0 overflow-hidden rounded-sm" />
          ) : (
            <Globe className="size-4 shrink-0 text-muted-foreground/50" />
          )}
          <span className="text-muted-foreground tabular-nums">+{callingCode}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2">
            <Input
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto px-1 pb-1">
            {filteredOptions.map((option, i) => {
              const Flag = getCountryFlag(option.code);
              const isPrioritySeparator =
                !countrySearch.trim() &&
                i === PRIORITY_COUNTRIES.length &&
                sortedOptions.length > PRIORITY_COUNTRIES.length;
              return (
                <Fragment key={option.code}>
                  {isPrioritySeparator ? <div className="my-1 h-px bg-border" /> : null}
                  <button
                    type="button"
                    onClick={() => handleCountryChange(option.code)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                      option.code === selectedCountry && "bg-accent",
                    )}
                  >
                    {Flag ? (
                      <Flag className="h-3.5 w-5 shrink-0 overflow-hidden rounded-sm" />
                    ) : (
                      <Globe className="size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span>{option.code}</span>
                    <span className="text-muted-foreground">+{option.callingCode}</span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={nationalNumber}
        onChange={handleNumberChange}
        onBlur={handleBlur}
        placeholder={defaultPlaceholder}
        disabled={disabled}
        className="flex-1"
        {...props}
      />
    </div>
  );
}

export type { CountryCode, PhoneAnalysis, PhoneValidationStatus };
