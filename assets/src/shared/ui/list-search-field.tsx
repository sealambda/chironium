import { Search } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";

interface ListSearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
}

/**
 * Search control used in list pages (e.g. customers).
 */
export function ListSearchField({ value, onChange, placeholder }: ListSearchFieldProps) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </InputGroup>
  );
}
