import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/utils";

interface DetailSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Chart placeholder rendered above the table */
  chartPlaceholder?: ReactNode;
  /** Callback when the Add button is clicked */
  onAdd?: () => void;
  /** Label for the Add button */
  addButtonLabel?: string;
  /** Table or content */
  children: ReactNode;
  /** Whether data is still loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
  /** Custom class names for the Add button (color theming) */
  addButtonClassName?: string;
}

/**
 * Desktop section component for the customer detail page.
 * Renders chart + title bar with add button + DataTable inline (no drawer).
 */
export function DetailSection({
  title,
  chartPlaceholder,
  onAdd,
  addButtonLabel,
  children,
  isLoading,
  className,
  addButtonClassName,
}: Readonly<DetailSectionProps>) {
  return (
    <div className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      {/* Header with title + add button */}
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">{title}</h3>
        {onAdd ? (
          <Button
            size="sm"
            variant="outline"
            className={cn("border-primary text-primary hover:bg-primary/10", addButtonClassName)}
            onClick={onAdd}
          >
            <PlusIcon className="size-4" />
            {addButtonLabel ?? m.common_add()}
          </Button>
        ) : null}
      </div>

      {/* Chart area */}
      {chartPlaceholder ? (
        <div className="flex items-center justify-center border-t p-6">{chartPlaceholder}</div>
      ) : null}

      {/* Scrollable table area */}
      <div className="max-h-[500px] overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
