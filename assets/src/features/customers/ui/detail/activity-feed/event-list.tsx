import type { ReactElement } from "react";

interface EventListProps<T> {
  readonly items: readonly T[];
  readonly getKey: (item: T) => string;
  readonly renderItem: (item: T) => ReactElement;
}

export function EventList<T>({ items, getKey, renderItem }: EventListProps<T>) {
  if (items.length === 0) {
    return null;
  }
  if (items.length === 1) {
    const first = items[0];
    if (!first) {
      return null;
    }
    return renderItem(first);
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  );
}
