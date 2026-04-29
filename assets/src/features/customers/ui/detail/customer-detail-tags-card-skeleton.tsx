import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/utils";

interface CustomerDetailTagsCardSkeletonProps {
  /** Two columns match allergy/intolerance layout; one column for single tag lists. */
  readonly columns: 1 | 2;
  readonly compact?: boolean;
}

export function CustomerDetailTagsCardSkeleton({
  columns,
  compact,
}: Readonly<CustomerDetailTagsCardSkeletonProps>) {
  const outerClass = cn(
    "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
    compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
  );

  if (columns === 1) {
    return (
      <div className={outerClass}>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-28" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={String(i)} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={outerClass}>
      <div className={cn("grid grid-cols-1", compact ? "gap-3" : "gap-4 sm:grid-cols-2")}>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-20" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={String(i)} className="h-7 w-18 rounded-full" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-24" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={String(i)} className="h-7 w-22 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
