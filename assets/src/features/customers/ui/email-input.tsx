import type { ComponentProps } from "react";
import { useCallback } from "react";
import { Input } from "@/shared/ui/input";

/**
 * Valid email characters according to RFC 5321 (practical subset):
 * - Letters (a-z, A-Z)
 * - Numbers (0-9)
 * - @ symbol
 * - Dot (.)
 * - Hyphen (-)
 * - Underscore (_)
 * - Plus (+) - commonly used for email aliases
 *
 * This covers the vast majority of real-world email addresses.
 * Format validation (e.g., single @, proper domain) is handled by z.email().
 */
const INVALID_EMAIL_CHARS = /[^a-zA-Z0-9@._+-]/g;

interface EmailInputProps
  extends Omit<ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Email input with real-time character filtering.
 * Only allows characters valid in email addresses.
 * Automatically strips invalid characters as the user types.
 */
export function EmailInput({ value, onChange, ...props }: EmailInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const filtered = e.target.value.replace(INVALID_EMAIL_CHARS, "");
      onChange(filtered);
    },
    [onChange],
  );

  return (
    <Input
      type="email"
      inputMode="email"
      value={value}
      onChange={handleChange}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      {...props}
    />
  );
}
