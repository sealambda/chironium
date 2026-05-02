import { useCallback, useMemo, useState } from "react";

import type { TerminologyTag } from "@/shared/types/terminology";

export function useTerminologyTagList(initialTags: readonly TerminologyTag[] = []) {
  const [tags, setTags] = useState<TerminologyTag[]>(() => [...initialTags]);

  const addTag = useCallback((tag: TerminologyTag) => {
    setTags((current) => [...current, tag]);
  }, []);

  const removeTag = useCallback((index: number) => {
    setTags((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const resetTags = useCallback((nextTags: readonly TerminologyTag[] = []) => {
    setTags([...nextTags]);
  }, []);

  return { tags, setTags, addTag, removeTag, resetTags };
}

export function useTerminologyPendingFields<TField extends string>() {
  const [pendingByField, setPendingByField] = useState<Partial<Record<TField, boolean>>>({});
  const [pendingError, setPendingError] = useState<string | null>(null);

  const hasPendingInput = useMemo(
    () => Object.values(pendingByField).some(Boolean),
    [pendingByField],
  );

  const setFieldPending = useCallback((field: TField, pending: boolean) => {
    setPendingByField((current) => ({ ...current, [field]: pending }));
    if (!pending) {
      setPendingError(null);
    }
  }, []);

  const getFieldError = useCallback(
    (field: TField) => (pendingByField[field] && pendingError ? pendingError : undefined),
    [pendingByField, pendingError],
  );

  const clearPendingError = useCallback(() => setPendingError(null), []);

  return {
    clearPendingError,
    getFieldError,
    hasPendingInput,
    pendingError,
    setFieldPending,
    setPendingError,
  };
}
