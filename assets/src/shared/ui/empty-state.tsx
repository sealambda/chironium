import type React from "react";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

interface EmptyStateProps {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly className?: string;
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex min-h-48 items-center justify-center rounded-2xl border border-border/50 border-dashed bg-card/50", className)}
    >
      <div className="flex flex-col items-center gap-2 p-6 text-center sm:gap-3">
        <Icon className="size-10 text-muted-foreground sm:size-12" />
        <div>
          <div className="font-medium text-muted-foreground">{title}</div>
          {description ? <div className="text-muted-foreground text-sm">{description}</div> : null}
        </div>
        {actionLabel && onAction ? (
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
