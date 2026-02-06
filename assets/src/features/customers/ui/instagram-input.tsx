import { useCallback } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/shared/ui/input-group";

interface InstagramInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

/**
 * Instagram username input with auto-formatting.
 * - Forces lowercase
 * - Shows @ prefix in addon (not editable)
 * - Strips invalid characters
 * - Max 30 characters
 */
export function InstagramInput({
  value,
  onChange,
  onBlur,
  disabled,
  ...props
}: InstagramInputProps) {
  // Strip @ from display value (shown in addon).
  const displayValue = value.startsWith("@") ? value.slice(1) : value;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.toLowerCase();

      // Remove leading @ (shown in addon).
      raw = raw.replace(/^@/, "");

      // Only allow valid Instagram characters: a-z, 0-9, periods, underscores.
      raw = raw.replace(/[^a-z0-9_.]/g, "").slice(0, 30);

      // Store with @ prefix (or empty string if no content).
      onChange(raw ? `@${raw}` : "");
    },
    [onChange],
  );

  return (
    <InputGroup data-disabled={disabled}>
      <InputGroupAddon align="inline-start">
        <InputGroupText>@</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        value={displayValue}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
      />
    </InputGroup>
  );
}
