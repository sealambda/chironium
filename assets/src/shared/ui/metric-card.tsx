import { format } from "date-fns";
import type * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { cn } from "@/shared/utils";

export interface MetricCardProps {
  /** Title displayed in the card header */
  title: string;
  /** Last updated date - displays as "Last updated: [formatted date]" */
  lastUpdated?: Date;
  /** Card content */
  children: React.ReactNode;
  /** Click handler - makes the card interactive with hover state when provided */
  onClick?: () => void;
  /** Additional class names for the card */
  className?: string;
}

/**
 * Reusable card component for displaying metric summaries on the customer detail screen.
 * Uses the base Card component with consistent styling for title, last updated date, and content.
 */
export function MetricCard({
  title,
  lastUpdated,
  children,
  onClick,
  className,
}: Readonly<MetricCardProps>) {
  const cardContent = (
    <Card className={cn(onClick && "pointer-events-none", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {lastUpdated && (
          <CardDescription>
            Last updated: {format(lastUpdated, "MMM d, yyyy")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full cursor-pointer text-left transition-colors [&>*]:hover:bg-accent/50"
      >
        {cardContent}
      </button>
    );
  }

  return cardContent;
}
