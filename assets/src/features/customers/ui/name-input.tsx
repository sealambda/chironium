import { type ComponentProps, useCallback } from "react";
import { Input } from "@/shared/ui/input";

/**
 * Regex pattern for valid name characters:
 * - Unicode letters (\p{L}) - handles accented characters like á, é, ñ, ü, ç
 * - Spaces - for compound names like "María José"
 * - Hyphens - for names like "García-López", "Jean-Pierre"
 * - Apostrophes - for names like "O'Sullivan", "D'Angelo"
 * - Periods - for "Jr.", "Sr."
 */
const INVALID_NAME_CHARS = /[^\p{L}\s'.-]/gu;

/**
 * Matches consecutive special characters (periods, hyphens, apostrophes).
 * Captures first special char, then matches any following special chars.
 * Used to collapse "Jr......" -> "Jr.", ".-" -> ".", "'--" -> "'"
 */
const CONSECUTIVE_SPECIAL_CHARS = /([.''-])[.''-]+/g;

interface NameInputProps
  extends Omit<ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Name input with real-time character filtering.
 * Only allows letters (including accented), spaces, hyphens, apostrophes, and periods.
 * Prevents consecutive special characters (e.g., "Jr..." -> "Jr.", "O''Sullivan" -> "O'Sullivan").
 * Automatically strips invalid characters as the user types.
 */
export function NameInput({ value, onChange, ...props }: NameInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let filtered = e.target.value.replace(INVALID_NAME_CHARS, "");

      // Collapse consecutive special characters (e.g., ".." -> ".", ".-" -> ".", "'-." -> "'").
      filtered = filtered.replace(CONSECUTIVE_SPECIAL_CHARS, "$1");

      onChange(filtered);
    },
    [onChange],
  );

  return (
    <Input
      value={value}
      onChange={handleChange}
      autoCapitalize="words"
      spellCheck={false}
      {...props}
    />
  );
}
