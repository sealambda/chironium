import { format, formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, FileText, Send } from "lucide-react";
import { cn } from "@/shared/utils";
import type {
  CustomerAction,
  CustomerActionType,
} from "../model/customer-types";

interface ActionCellProps {
  action?: CustomerAction;
  /** Display variant */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Action cell component for displaying customer actions.
 *
 * Shows:
 * - Action type icon
 * - Action description
 * - Relative time (e.g., "2 days ago" or "in 3 days")
 * - Overdue indicator (red text) if past due and not completed
 * - Completion indicator (green checkmark) if completed
 *
 * Tooltip shows absolute date on hover.
 */
export function ActionCell({
  action,
  variant = "full",
  className,
}: ActionCellProps) {
  if (!action) {
    return (
      <div className={cn("text-muted-foreground text-xs", className)}>
        No action scheduled
      </div>
    );
  }

  const now = new Date();
  const isOverdue = action.dueDate < now && !action.completedDate;
  const isCompleted = Boolean(action.completedDate);

  // Get relative time
  const relativeTime = formatDistanceToNow(
    isCompleted && action.completedDate ? action.completedDate : action.dueDate,
    { addSuffix: true },
  );

  // Get absolute date for tooltip
  const absoluteDate = format(
    isCompleted && action.completedDate ? action.completedDate : action.dueDate,
    "PPP",
  );

  // Get action description and icon
  const { icon: Icon, description } = getActionConfig(
    action.type,
    action.assignedTo,
  );

  if (variant === "compact") {
    return (
      <div
        className={cn("flex items-center gap-1.5 text-xs", className)}
        title={`${description} ${absoluteDate}`}
      >
        <Icon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span
          className={cn(
            "truncate",
            isCompleted && "text-emerald-600 dark:text-emerald-400",
            isOverdue && "text-red-600 dark:text-red-400",
            !isCompleted && !isOverdue && "text-foreground",
          )}
        >
          {relativeTime}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)} title={absoluteDate}>
      {/* Action description with icon */}
      <div className="flex items-center gap-1.5">
        <Icon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="font-medium text-foreground text-xs">
          {description}
        </span>
        {isCompleted && (
          <CheckCircle2
            className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-label="Completed"
          />
        )}
        {isOverdue && (
          <Clock
            className="size-3.5 shrink-0 text-red-600 dark:text-red-400"
            aria-label="Overdue"
          />
        )}
      </div>

      {/* Relative time */}
      <div
        className={cn(
          "text-xs",
          isCompleted && "text-emerald-600 dark:text-emerald-400",
          isOverdue && "font-medium text-red-600 dark:text-red-400",
          !isCompleted && !isOverdue && "text-muted-foreground",
        )}
      >
        {relativeTime}
      </div>
    </div>
  );
}

/**
 * Get icon and description for an action type.
 */
function getActionConfig(
  type: CustomerActionType,
  assignedTo: "customer" | "team",
): {
  icon: typeof FileText;
  description: string;
} {
  switch (type) {
    case "report_sent":
      return {
        icon: Send,
        description: assignedTo === "customer" ? "Report sent" : "Sent report",
      };
    case "report_received":
      return {
        icon: FileText,
        description:
          assignedTo === "customer" ? "Report received" : "Received report",
      };
    case "review_sent":
      return {
        icon: Send,
        description: assignedTo === "team" ? "Review sent" : "Sent review",
      };
    case "review_received":
      return {
        icon: CheckCircle2,
        description:
          assignedTo === "customer" ? "Review received" : "Received review",
      };
  }
  // Exhaustive check - TypeScript will error if we miss a case
  const _exhaustiveCheck: never = type;
  return _exhaustiveCheck;
}
