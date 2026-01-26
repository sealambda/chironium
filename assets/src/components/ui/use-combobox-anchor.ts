import { type RefObject, useRef } from "react";

/**
 * Hook for managing combobox anchor reference.
 * Provides a ref for positioning combobox popover.
 *
 * Separated from combobox.tsx to maintain Fast Refresh compatibility.
 */
export function useComboboxAnchor(): RefObject<HTMLDivElement | null> {
  return useRef<HTMLDivElement | null>(null);
}
