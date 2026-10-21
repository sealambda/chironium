import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  type ConceptSearchContext,
  searchTerminologySuggestions,
  type TerminologySuggestion,
} from "@/features/customers/api/terminology-api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { FieldLabel } from "@/shared/ui/field";

import type { TerminologyTag } from "../types/terminology";

export function TerminologyTagChips({
  tags,
  disabled,
  onRemove,
}: Readonly<{
  tags: readonly TerminologyTag[];
  disabled?: boolean;
  onRemove: (index: number) => void;
}>) {
  if (tags.length === 0) {
    return null;
  }
  return (
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
  );
}

export function TerminologySuggestionsMenu({
  menuStyle,
  isSearching,
  suggestions,
  onPick,
}: {
  menuStyle: { top: number; left: number; width: number };
  isSearching: boolean;
  suggestions: TerminologySuggestion[];
  onPick: (s: TerminologySuggestion) => void;
}) {
  return createPortal(
    <div
      className="fixed z-50 max-h-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
      style={{
        top: menuStyle.top,
        left: menuStyle.left,
        width: menuStyle.width,
      }}
    >
      {isSearching ? (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">{m.common_loading()}</div>
      ) : (
        suggestions.map((suggestion) => (
          <button
            key={`${suggestion.system}:${suggestion.code}:${suggestion.label}`}
            type="button"
            onClick={() => onPick(suggestion)}
            className="w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
          >
            {suggestion.label}
          </button>
        ))
      )}
    </div>,
    document.body,
  );
}

export function TerminologyFieldLabel({ show, label }: Readonly<{ show: boolean; label: string }>) {
  if (!show) {
    return null;
  }
  return <FieldLabel>{label}</FieldLabel>;
}

/** Shared search field state, suggestion fetch, and anchored menu positioning. */
export function useTerminologyTagSearchField({
  organizationId,
  conceptContext,
  disabled,
  maxLength = 50,
  onPendingChange,
}: {
  organizationId: string;
  conceptContext: ConceptSearchContext;
  disabled?: boolean;
  maxLength?: number;
  onPendingChange?: (hasPending: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<TerminologySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const locale = getLocale();

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

  const onInputChange = useCallback(
    (raw: string) => {
      const value = raw.slice(0, maxLength);
      setInputValue(value);
      onPendingChange?.(value.trim().length > 0);
    },
    [maxLength, onPendingChange],
  );

  return {
    inputContainerRef,
    inputValue,
    resetInput,
    onInputChange,
    showMenu,
    menuStyle,
    isSearching,
    suggestions,
  };
}
