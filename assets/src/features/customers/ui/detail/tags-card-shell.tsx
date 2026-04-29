import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CustomerDetailEmptyCard } from "@/features/customers/ui/detail/customer-detail-empty-card";
import { CustomerDetailTagsCardSkeleton } from "@/features/customers/ui/detail/customer-detail-tags-card-skeleton";
import { cn } from "@/shared/utils/utils";

interface TagsCardShellProps {
  readonly isLoading?: boolean;
  readonly isEmpty: boolean;
  readonly emptyIcon: LucideIcon;
  readonly emptyTitle: ReactNode;
  readonly emptyDescription: ReactNode;
  readonly compact?: boolean;
  readonly columns?: 1 | 2;
  readonly children: ReactNode;
}

export function TagsCardShell({
  isLoading,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  compact,
  columns = 1,
  children,
}: TagsCardShellProps) {
  if (isLoading) {
    return <CustomerDetailTagsCardSkeleton columns={columns} compact={compact} />;
  }
  if (isEmpty) {
    return (
      <CustomerDetailEmptyCard icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
      )}
    >
      {columns === 2 ? (
        <div
          className={cn("grid grid-cols-2 divide-x divide-border", compact ? "gap-x-3" : "gap-x-4")}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
