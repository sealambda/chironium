import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Top row with the add action aligned to the end (most empty detail cards). */
export function CustomerDetailEmptyCardAddRow({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex items-start justify-end">{children}</div>;
}

interface CustomerDetailEmptyCardProps {
  readonly header: ReactNode;
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly description: ReactNode;
}

interface CustomerDetailEmptyCardContentProps {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly description: ReactNode;
}

/** Shared shell and body for customer detail cards in an empty state. */
export function CustomerDetailEmptyCard({
  header,
  icon: Icon,
  title,
  description,
}: Readonly<CustomerDetailEmptyCardProps>) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      {header}
      <CustomerDetailEmptyCardContent icon={Icon} title={title} description={description} />
    </div>
  );
}

export function CustomerDetailEmptyCardContent({
  icon: Icon,
  title,
  description,
}: Readonly<CustomerDetailEmptyCardContentProps>) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Icon className="size-10 shrink-0 text-muted-foreground/60" aria-hidden />
      <div className="text-center">
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="mt-0.5 text-foreground/65 text-xs">{description}</p>
      </div>
    </div>
  );
}
