import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  type ConceptSearchContext,
  searchTerminologySuggestions,
  type TerminologySuggestion,
} from "@/features/customers/api/terminology-api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import type { TerminologyTag } from "@/shared/types/terminology";
import { Button } from "@/shared/ui/button";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils/utils";

interface TerminologyTagInputProps {
  readonly label: string;
  readonly placeholder: string;
  readonly tags: readonly TerminologyTag[];
  readonly onAdd: (tag: TerminologyTag) => void;
  readonly onRemove: (index: number) => void;
  readonly organizationId: string;
  readonly conceptContext: ConceptSearchContext;
  readonly maxLength?: number;
  readonly maxTags?: number;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly onPendingChange?: (hasPending: boolean) => void;
  readonly addLabel: string;
}

export function TerminologyTagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
  organizationId,
  conceptContext,
  maxLength = 50,
  maxTags,
  disabled,
  error,
  onPendingChange,
  addLabel,
}: TerminologyTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<TerminologySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const inputContainerRef = useRef<HTMLDivElement | null>(null);

  const atLimit = maxTags !== undefined && tags.length >= maxTags;
  const locale = getLocale();

  const existingLabels = useMemo(() => tags.map((t) => t.label.toLowerCase()), [tags]);
  const showSuggestions = !disabled && suggestions.length > 0;
  const showMenu = !disabled && (isSearching || showSuggestions);

  const syncMenuPosition = useCallback(() => {
    if (!showMenu || !inputContainerRef.current) {
      setMenuStyle(null);
      return;
    }

    const rect = inputContainerRef.current.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [showMenu]);

  useEffect(() => {
    if (!organizationId || inputValue.trim().length < 2 || disabled) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = globalThis.setTimeout(async () => {
      try {
        const next = await searchTerminologySuggestions(
          inputValue,
          locale,
          organizationId,
          conceptContext,
        );
        if (!cancelled) {
          setSuggestions(next);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, [conceptContext, disabled, inputValue, locale, organizationId]);

  useEffect(() => {
    if (!showMenu) {
      setMenuStyle(null);
      return;
    }

    syncMenuPosition();
    const handleScroll = () => syncMenuPosition();
    const handleResize = () => syncMenuPosition();
    globalThis.addEventListener("scroll", handleScroll, true);
    globalThis.addEventListener("resize", handleResize);

    return () => {
      globalThis.removeEventListener("scroll", handleScroll, true);
      globalThis.removeEventListener("resize", handleResize);
    };
  }, [showMenu, syncMenuPosition]);

  const resetInput = useCallback(() => {
    setInputValue("");
    setSuggestions([]);
    onPendingChange?.(false);
  }, [onPendingChange]);

  const addFreeTextParts = useCallback(() => {
    const parts = inputValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      return;
    }

    let added = 0;
    for (const part of parts) {
      if (maxTags !== undefined && tags.length + added >= maxTags) {
        break;
      }
      if (existingLabels.includes(part.toLowerCase())) {
        continue;
      }
      onAdd({ label: part });
      added += 1;
    }

    resetInput();
  }, [existingLabels, inputValue, maxTags, onAdd, resetInput, tags.length]);

  const addSuggestion = useCallback(
    (s: TerminologySuggestion) => {
      if (maxTags !== undefined && tags.length >= maxTags) {
        return;
      }
      if (existingLabels.includes(s.label.toLowerCase())) {
        resetInput();
        return;
      }
      onAdd({
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
    [existingLabels, maxTags, onAdd, resetInput, tags.length],
  );

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <div ref={inputContainerRef} className="relative flex-1">
          <Input
            value={inputValue}
            onChange={(e) => {
              const value = e.target.value.slice(0, maxLength);
              setInputValue(value);
              onPendingChange?.(value.trim().length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFreeTextParts();
              }
            }}
            placeholder={atLimit ? "" : placeholder}
            className={cn("w-full", inputValue && "pr-8")}
            disabled={disabled || atLimit}
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
        <Button
          variant="outline"
          size="sm"
          onClick={addFreeTextParts}
          disabled={disabled || !inputValue.trim() || atLimit}
          type="button"
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>
      {showMenu && menuStyle
        ? createPortal(
            <div
              className="fixed z-50 max-h-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
              style={{
                top: menuStyle.top,
                left: menuStyle.left,
                width: menuStyle.width,
              }}
            >
              {isSearching ? (
                <div className="px-2 py-1.5 text-muted-foreground text-sm">
                  {m.common_loading()}
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.system}:${suggestion.code}:${suggestion.label}`}
                    type="button"
                    onClick={() => addSuggestion(suggestion)}
                    className="w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    {suggestion.label}
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag, index) => (
            <span
              key={`${tag.label}-${String(index)}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-sm"
            >
              {tag.label}
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
