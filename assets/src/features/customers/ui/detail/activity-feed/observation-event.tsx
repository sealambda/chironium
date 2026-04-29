import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ObservationItem } from "@/features/customers/api/observations-api";
import * as m from "@/paraglide/messages";
import { MarkdownContent } from "@/shared/ui/markdown-content";
import { cn } from "@/shared/utils/utils";

interface ObservationEventProps {
  observation: ObservationItem;
}

export function ObservationEvent({ observation }: Readonly<ObservationEventProps>) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const clampRef = useRef<HTMLDivElement>(null);

  const text = observation.valueString ?? "";

  // Measure whether the clamped container hides any content. Using line-clamp
  // means collapsing happens on whole-line boundaries, so a note that fits in
  // exactly N lines won't be marked as overflowing.
  useEffect(() => {
    const el = clampRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setIsOverflowing(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isCollapsed = !expanded && isOverflowing;

  return (
    <div className="space-y-1">
      <div className="relative">
        <MarkdownContent
          ref={clampRef}
          content={text}
          className={cn("text-justify", !expanded && "line-clamp-3")}
        />
        {isCollapsed ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-card"
          />
        ) : null}
      </div>
      {isOverflowing ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded-sm text-muted-foreground text-xs transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" aria-hidden />
              {m.activity_show_less()}
            </>
          ) : (
            <>
              <ChevronDown className="size-3" aria-hidden />
              {m.activity_show_more()}
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
