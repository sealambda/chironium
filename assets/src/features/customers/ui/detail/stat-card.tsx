import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils/utils";

interface StatCardProps {
  /** Background color for the entire card (e.g., "bg-blue-50/50") */
  cardBgColor?: string;
  /** Label text displayed below the icon */
  label: string;
  /** Primary value to display (large text) */
  value: string | number;
  /** Unit suffix for the value (e.g., "kg", "kcal") */
  unit?: string;
  /** Subtitle text shown below the value */
  subtitle?: ReactNode;
  /** Trend indicator */
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  /** Chart placeholder to show at the top of the card */
  chartPlaceholder?: ReactNode;
  /** Click handler - makes the card interactive */
  onClick?: () => void;
  /** Whether the card is in loading state */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

function StatCardValueRow({
  value,
  unit,
  trend,
}: Readonly<Pick<StatCardProps, "value" | "unit" | "trend">>) {
  return (
    <>
      <span className="font-bold text-foreground text-lg">{value}</span>
      {unit ? <span className="text-muted-foreground text-xs">{unit}</span> : null}
      {trend ? (
        <span
          className={cn(
            "ml-1 flex items-center gap-0.5 font-medium text-[10px]",
            trend.direction === "up" ? "text-emerald-600" : "text-red-500",
          )}
        >
          {trend.direction === "up" ? (
            <TrendingUp className="size-2.5" />
          ) : (
            <TrendingDown className="size-2.5" />
          )}
          {trend.value > 0 ? "+" : ""}
          {trend.value}%
        </span>
      ) : null}
    </>
  );
}

/**
 * Compact stat card component for the customer dashboard.
 * Layout: Chart in center, data at bottom.
 */
export function StatCard({
  cardBgColor,
  label,
  value,
  unit,
  subtitle,
  trend,
  chartPlaceholder,
  onClick,
  isLoading,
  className,
}: Readonly<StatCardProps>) {
  const content = (
    <div
      className={cn(
        "flex aspect-square flex-col rounded-2xl border border-border/30 p-4 shadow-sm md:aspect-[2/1]",
        cardBgColor || "bg-card",
        onClick && "cursor-pointer transition-all hover:shadow-md",
        className,
      )}
    >
      {chartPlaceholder ? (
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          {chartPlaceholder}
        </div>
      ) : null}

      <div className="mt-auto shrink-0 pt-2">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>

        <div className="flex items-baseline gap-0.5">
          {isLoading ? (
            <div className="h-5 w-14 animate-pulse rounded bg-muted" />
          ) : (
            <StatCardValueRow value={value} unit={unit} trend={trend} />
          )}
        </div>

        {subtitle && !isLoading ? (
          <div className="text-[10px] text-muted-foreground leading-tight">{subtitle}</div>
        ) : null}
        {isLoading && subtitle !== undefined ? (
          <div className="mt-0.5 h-2.5 w-20 animate-pulse rounded bg-muted" />
        ) : null}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

/**
 * Loading skeleton for StatCard.
 */
export function StatCardSkeleton({
  className,
  cardBgColor,
}: {
  className?: string;
  cardBgColor?: string;
}) {
  return (
    <div
      className={cn(
        "flex aspect-square flex-col rounded-2xl border border-border/30 p-4 shadow-sm md:aspect-[2/1]",
        cardBgColor || "bg-card",
        className,
      )}
    >
      {/* Chart skeleton - fills remaining space */}
      <div className="min-h-0 w-full flex-1 animate-pulse rounded bg-muted/50" />

      {/* Bottom section skeleton */}
      <div className="mt-auto shrink-0 pt-2">
        {/* Label skeleton */}
        <div className="h-2.5 w-10 animate-pulse rounded bg-muted" />
        {/* Value skeleton */}
        <div className="mt-0.5 h-5 w-14 animate-pulse rounded bg-muted" />
        {/* Subtitle skeleton */}
        <div className="mt-0.5 h-2.5 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
