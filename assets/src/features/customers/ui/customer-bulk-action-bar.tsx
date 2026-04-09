import { UserPlus, XIcon } from "lucide-react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

interface CustomerBulkActionBarProps {
  readonly selectedCount: number;
  readonly onReassign: () => void;
  readonly onClear: () => void;
}

export function CustomerBulkActionBar({
  selectedCount,
  onReassign,
  onClear,
}: Readonly<CustomerBulkActionBarProps>) {
  if (selectedCount < 1) {
    return null;
  }

  return (
    <div
      className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 fixed bottom-6 left-1/2 z-50 w-max max-w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 rounded-full border border-border/60 bg-card py-2 pr-2 pl-4 shadow-lg ring-1 ring-foreground/5 duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in"
      data-state="open"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 shrink truncate font-medium text-foreground text-sm tabular-nums">
          {m.customers_bulk_selected({ count: selectedCount })}
        </p>
        <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
        <Button
          type="button"
          className={cn(
            "flex shrink-0 items-center justify-center gap-0 bg-primary font-semibold text-primary-foreground shadow-xs hover:bg-primary/90",
            "size-9 p-0 md:h-9 md:w-auto md:min-w-0 md:justify-start md:gap-1.5 md:px-4",
          )}
          onClick={onReassign}
          aria-label={m.customers_bulk_reassign()}
          data-testid="customers-reassign-button"
        >
          <UserPlus className="size-4 shrink-0" />
          <span className="hidden md:inline">{m.customers_bulk_reassign()}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "flex shrink-0 items-center justify-center gap-0 font-semibold",
            "size-9 md:h-8 md:w-auto md:min-w-0 md:justify-start md:gap-1 md:px-2.5",
          )}
          onClick={onClear}
          aria-label={m.customers_bulk_clear()}
        >
          <XIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="hidden md:inline">{m.customers_bulk_clear()}</span>
        </Button>
      </div>
    </div>
  );
}
