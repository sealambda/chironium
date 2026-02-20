import type React from "react";

import { Button } from "@/shared/ui/button";

interface EmptyStateProps {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className="flex min-h-48 items-center justify-center rounded-2xl border border-border/50 border-dashed bg-card/50"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Icon className="size-12 text-muted-foreground" />
        <div>
          <div className="font-medium text-muted-foreground">{title}</div>
          {description && <div className="text-muted-foreground text-sm">{description}</div>}
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
