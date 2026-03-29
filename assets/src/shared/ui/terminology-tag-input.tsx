import { Plus, X } from "lucide-react";
import { useCallback, useMemo } from "react";

import type {
  ConceptSearchContext,
  TerminologySuggestion,
} from "@/features/customers/api/terminology-api";
import type { TerminologyTag } from "@/shared/types/terminology";
import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  TerminologyFieldLabel,
  TerminologySuggestionsMenu,
  TerminologyTagChips,
  useTerminologyTagSearchField,
} from "@/shared/ui/terminology-tag-input-shared";
import { cn } from "@/shared/utils/utils";

interface TerminologyTagInputProps {
  readonly label: string;
  readonly placeholder: string;
  readonly showFieldLabel?: boolean;
  readonly tags: readonly TerminologyTag[];
  readonly onAdd: (tag: TerminologyTag) => void;
  readonly onRemove: (index: number) => void;
  readonly organizationId: string;
  readonly conceptContext: ConceptSearchContext;
  readonly maxLength?: number;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly onPendingChange?: (hasPending: boolean) => void;
  readonly addLabel: string;
  readonly showAddButton?: boolean;
}

/**
 * Add multiple terminology tags (comma-separated free text, suggestions, optional Add button).
 * For one replaceable tag, use `TerminologySingleTagInput` from `@/shared/ui/terminology-single-tag-input`.
 */
export function TerminologyTagInput({
  label,
  placeholder,
  showFieldLabel = true,
  tags,
  onAdd,
  onRemove,
  organizationId,
  conceptContext,
  maxLength = 50,
  disabled,
  error,
  onPendingChange,
  addLabel,
  showAddButton = true,
}: TerminologyTagInputProps) {
  const {
    inputContainerRef,
    inputValue,
    resetInput,
    onInputChange,
    showMenu,
    menuStyle,
    isSearching,
    suggestions,
  } = useTerminologyTagSearchField({
    organizationId,
    conceptContext,
    disabled,
    maxLength,
    onPendingChange,
  });

  const existingLabels = useMemo(() => tags.map((t) => t.label.toLowerCase()), [tags]);

  const commitTag = useCallback(
    (tag: TerminologyTag) => {
      onAdd(tag);
    },
    [onAdd],
  );

  const addFreeTextParts = useCallback(() => {
    const parts = inputValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      return;
    }

    for (const part of parts) {
      if (existingLabels.includes(part.toLowerCase())) {
        continue;
      }
      commitTag({ label: part });
    }

    resetInput();
  }, [commitTag, existingLabels, inputValue, resetInput]);

  const addSuggestion = useCallback(
    (s: TerminologySuggestion) => {
      if (existingLabels.includes(s.label.toLowerCase())) {
        resetInput();
        return;
      }
      commitTag({
        label: s.label,
        coding: {
          system: s.system,
          code: s.code,
          version: s.version ?? null,
          display: s.label,
        },
      });
      resetInput();
    },
    [commitTag, existingLabels, resetInput],
  );

  return (
    <Field>
      <TerminologyFieldLabel show={showFieldLabel} label={label} />
      <div className="flex gap-2">
        <div ref={inputContainerRef} className="relative flex-1">
          <Input
            aria-label={showFieldLabel ? undefined : placeholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFreeTextParts();
              }
            }}
            placeholder={placeholder}
            className={cn("w-full", inputValue && "pr-8")}
            disabled={disabled}
            aria-invalid={Boolean(error)}
          />
          {inputValue ? (
            <button
              type="button"
              onClick={resetInput}
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        {showAddButton ? (
          <Button
            variant="outline"
            size="sm"
            onClick={addFreeTextParts}
            disabled={disabled || !inputValue.trim()}
            type="button"
          >
            <Plus className="size-4" />
            {addLabel}
          </Button>
        ) : null}
      </div>
      {showMenu && menuStyle ? (
        <TerminologySuggestionsMenu
          menuStyle={menuStyle}
          isSearching={isSearching}
          suggestions={suggestions}
          onPick={addSuggestion}
        />
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <TerminologyTagChips tags={tags} disabled={disabled} onRemove={onRemove} />
    </Field>
  );
}
