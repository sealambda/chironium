import { Skeleton } from "@/shared/ui/skeleton";

function SkeletonEventCard() {
  return (
    <div className="group flex gap-3 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <div className="mt-2 w-px flex-1 bg-muted-foreground/80 group-last:hidden" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-1 h-3 w-32" />
        <div className="mt-3 space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="max-w-2xl">
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonEventCard key={String(i)} />
      ))}
    </div>
  );
}
