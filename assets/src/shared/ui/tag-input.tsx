import { Plus, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils/utils";

export interface TagInputProps {
  readonly label: string;
  readonly placeholder: string;
  readonly tags: readonly string[];
  readonly onAdd: (tag: string) => void;
  readonly onRemove: (index: number) => void;
  readonly maxLength?: number;
  readonly maxTags?: number;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly onPendingChange?: (hasPending: boolean) => void;
  readonly addLabel: string;
}

export function TagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
  maxLength = 50,
  maxTags,
  disabled,
  error,
  onPendingChange,
  addLabel,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.slice(0, maxLength);
      setInputValue(value);
      onPendingChange?.(value.trim().length > 0);
    },
    [maxLength, onPendingChange],
  );

  const handleAdd = useCallback(() => {
    const parts = inputValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      return;
    }

    let added = 0;
    for (const part of parts) {
      // Max tags check
      if (maxTags !== undefined && tags.length + added >= maxTags) {
        break;
      }
      // Duplicate prevention (case-insensitive)
      if (tags.some((t) => t.toLowerCase() === part.toLowerCase())) {
        continue;
      }
      onAdd(part);
      added++;
    }

    setInputValue("");
    onPendingChange?.(false);
  }, [inputValue, tags, maxTags, onAdd, onPendingChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const atLimit = maxTags !== undefined && tags.length >= maxTags;

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={atLimit ? "" : placeholder}
            className={cn("w-full", inputValue && "pr-8")}
            disabled={disabled || atLimit}
            aria-invalid={Boolean(error)}
          />
          {inputValue ? (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                onPendingChange?.(false);
              }}
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim() || atLimit}
          type="button"
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${String(index)}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                className="cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </Field>
  );
}
