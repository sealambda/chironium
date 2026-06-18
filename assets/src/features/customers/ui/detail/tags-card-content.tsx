import { Children, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

/** Maximum number of chip rows shown when collapsed. */
const COLLAPSED_ROWS = 3;

interface TagsCardTitleProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function TagsCardTitle({ children, className }: Readonly<TagsCardTitleProps>) {
  return (
    <p
      className={cn(
        "font-semibold text-foreground/70 text-sm uppercase tracking-widest",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface TagsCardPillListProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function rowExceeded(rowTops: number[], top: number, maxRows: number): boolean {
  if (!rowTops.some((rowTop) => Math.abs(rowTop - top) <= 1)) {
    rowTops.push(top);
  }

  return rowTops.length > maxRows;
}

function measureCollapsedCount(container: HTMLDivElement | null): number | null {
  if (!container) {
    return null;
  }

  const chips = Array.from(container.querySelectorAll<HTMLElement>("[data-chip]"));
  if (chips.length === 0) {
    return null;
  }

  const rowTops: number[] = [];
  let cutoff = chips.length;

  for (const [index, chip] of chips.entries()) {
    if (rowExceeded(rowTops, chip.offsetTop, COLLAPSED_ROWS)) {
      cutoff = index;
      break;
    }
  }

  return cutoff < chips.length ? cutoff : null;
}

export function TagsCardPillList({ children, className }: Readonly<TagsCardPillListProps>) {
  const [expanded, setExpanded] = useState(false);
  const [collapsedCount, setCollapsedCount] = useState<number | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => Children.toArray(children), [children]);

  // Measure which items fit within COLLAPSED_ROWS using an invisible ghost div
  // that always renders all chips at the natural wrapping width.
  useEffect(() => {
    const measure = () => {
      setCollapsedCount(measureCollapsedCount(measureRef.current));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (measureRef.current) {
      observer.observe(measureRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const hasOverflow = collapsedCount !== null;
  const visibleItems = hasOverflow && !expanded ? items.slice(0, collapsedCount ?? 0) : items;

  return (
    <div className="space-y-2">
      {/* Ghost: invisible, always full list, used only for measurement. */}
      <div className="relative">
        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute inset-x-0 top-0"
        >
          <div className={cn("flex flex-wrap gap-1.5", className)}>
            {items.map((item, i) => (
              <div key={i} data-chip>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className={cn("flex flex-wrap gap-1.5", className)}>{visibleItems}</div>
      </div>

      {hasOverflow ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? m.show_less() : m.show_more()}
        </Button>
      ) : null}
    </div>
  );
}

interface TagsCardColumnProps {
  readonly title: ReactNode;
  readonly isEmpty: boolean;
  readonly emptyText: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export function TagsCardColumn({
  title,
  isEmpty,
  emptyText,
  className,
  children,
}: Readonly<TagsCardColumnProps>) {
  const content = isEmpty ? (
    <p className="text-muted-foreground text-sm italic">{emptyText}</p>
  ) : (
    children || null
  );

  return (
    <div className={cn("space-y-3", className)}>
      <TagsCardTitle>{title}</TagsCardTitle>
      {content}
    </div>
  );
}
