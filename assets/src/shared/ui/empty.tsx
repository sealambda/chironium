import { FolderOpen } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/utils";
import { Button } from "./button";

interface EmptyProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Empty state component for displaying when no data is available.
 * Follows BaseCN patterns with optional icon, title, description, and action button.
 */
export function Empty({
  title,
  description,
  action,
  icon,
  className,
}: Readonly<EmptyProps>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div className="flex size-16 items-center justify-center rounded-lg bg-muted/50">
        {icon ?? <FolderOpen className="size-8 text-muted-foreground" />}
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
        <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
      </div>

      {/* Optional Action Button */}
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
