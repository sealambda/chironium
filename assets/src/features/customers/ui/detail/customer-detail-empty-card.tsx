import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface CustomerDetailEmptyCardProps {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly description?: ReactNode;
}

/** Centered empty state for a clinical summary card.
 *  Icon and title sit on the centerline; description is optional and muted. */
export function CustomerDetailEmptyCard({
  icon: Icon,
  title,
  description,
}: Readonly<CustomerDetailEmptyCardProps>) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 border-dashed bg-card p-4 text-center lg:p-5">
      <Icon className="size-6 shrink-0 text-muted-foreground/60" aria-hidden />
      <p className="font-medium text-foreground/80 text-sm">{title}</p>
      {description ? (
        <p className="line-clamp-2 max-w-xs text-muted-foreground text-xs">{description}</p>
      ) : null}
    </div>
  );
}
