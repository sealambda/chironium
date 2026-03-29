import { Skeleton } from "@/shared/ui/skeleton";

interface CustomerDetailTagsCardSkeletonProps {
  /** Two columns match allergy/intolerance layout; one column for single tag lists. */
  readonly columns: 1 | 2;
}

export function CustomerDetailTagsCardSkeleton({
  columns,
}: Readonly<CustomerDetailTagsCardSkeletonProps>) {
  if (columns === 1) {
    return (
      <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
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
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
