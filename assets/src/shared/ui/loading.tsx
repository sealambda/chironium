import * as m from "@/paraglide/messages";
import { cn } from "@/shared/utils/utils";

interface LoadingProps {
  /** Optional classes for the outer flex container (e.g. min height). */
  readonly className?: string;
}

/**
 * Loading indicator centered within the parent. Pair with a min-height on the
 * parent or pass `className` so the spinner has room to sit in the middle.
 */
export function Loading({ className }: Readonly<LoadingProps>) {
  return (
    <div className={cn("flex min-h-96 w-full items-center justify-center", className)}>
      <span className="sr-only">{m.common_loading()}</span>
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        aria-hidden
      />
    </div>
  );
}
