import { useCallback, useState } from "react";

interface UseControllableStateParams<Value> {
  readonly value?: Value;
  readonly defaultValue: Value;
  readonly onChange?: (value: Value) => void;
}

export function useControllableState<Value>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateParams<Value>) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const setValue = useCallback(
    (nextValue: Value) => {
      onChange?.(nextValue);
      if (!isControlled) {
        setInternalValue(nextValue);
      }
    },
    [isControlled, onChange],
  );

  return [currentValue, setValue, isControlled] as const;
}
