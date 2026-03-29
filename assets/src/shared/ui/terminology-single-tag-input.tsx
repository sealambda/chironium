import { X } from "lucide-react";
import { useCallback, useMemo } from "react";

import type {
  ConceptSearchContext,
  TerminologySuggestion,
} from "@/features/customers/api/terminology-api";
import type { TerminologyTag } from "@/shared/types/terminology";
import { Field } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  TerminologyFieldLabel,
  TerminologySuggestionsMenu,
  TerminologyTagChips,
  useTerminologyTagSearchField,
} from "@/shared/ui/terminology-tag-input-shared";
import { cn } from "@/shared/utils/utils";

export interface TerminologySingleTagInputProps {
  readonly label: string;
  readonly placeholder: string;
  readonly showFieldLabel?: boolean;
  readonly tag: TerminologyTag | null;
  readonly onTagChange: (tag: TerminologyTag | null) => void;
  readonly organizationId: string;
  readonly conceptContext: ConceptSearchContext;
  readonly maxLength?: number;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly onPendingChange?: (hasPending: boolean) => void;
}

/**
 * One terminology tag at a time: typing or picking a suggestion replaces the current value.
 * For history “edit element” flows without multi-tag comma batching or an add button.
 */
export function TerminologySingleTagInput({
  label,
  placeholder,
  showFieldLabel = true,
  tag,
  onTagChange,
  organizationId,
  conceptContext,
  maxLength = 50,
  disabled,
  error,
  onPendingChange,
}: TerminologySingleTagInputProps) {
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

  const existingLower = useMemo(() => (tag ? tag.label.toLowerCase() : null), [tag]);

  const commitTag = useCallback(
    (next: TerminologyTag) => {
      if (existingLower !== null && next.label.toLowerCase() === existingLower) {
        resetInput();
        return;
      }
      onTagChange(next);
      resetInput();
    },
    [existingLower, onTagChange, resetInput],
  );

  const addFreeText = useCallback(() => {
    const part = inputValue
      .split(",")
      .map((s) => s.trim())
      .find(Boolean);
    if (!part) {
      return;
    }
    commitTag({ label: part });
  }, [commitTag, inputValue]);

  const addSuggestion = useCallback(
    (s: TerminologySuggestion) => {
      commitTag({
        label: s.label,
        coding: {
          system: s.system,
          code: s.code,
          version: s.version ?? null,
          display: s.label,
        },
      });
    },
    [commitTag],
  );

  const tags = tag ? [tag] : [];

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
                addFreeText();
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
      <TerminologyTagChips tags={tags} disabled={disabled} onRemove={() => onTagChange(null)} />
    </Field>
  );
}
