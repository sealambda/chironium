import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/shared/utils/utils";

/**
 * Shared visual primitive for clinical-history pills (allergies, conditions,
 * medications, food preferences). Each domain card maps its semantic state to
 * a `tone` and lets this component handle layout, colors, and interaction.
 *
 * Renders as a `<button type="button">` when `onClick` is provided, otherwise
 * as a `<span>`. The optional `srLabel` adds a screen-reader-only suffix.
 */
const tagPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
  {
    variants: {
      tone: {
        red: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50",
        orange:
          "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50",
        blue: "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50",
        violet:
          "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50",
        emerald:
          "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50",
        yellow:
          "border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700/40 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50",
        muted:
          "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700/50 dark:bg-neutral-900/40 dark:text-neutral-300 dark:hover:bg-neutral-900/60",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      tone: "blue",
      interactive: false,
    },
  },
);

export type TagPillTone = NonNullable<VariantProps<typeof tagPillVariants>["tone"]>;

interface TagPillProps
  extends Omit<ComponentPropsWithoutRef<"button">, "type" | "children" | "onClick"> {
  readonly tone: TagPillTone;
  readonly children: ReactNode;
  readonly onClick?: () => void;
  /** Optional screen-reader-only suffix appended after the visible label. */
  readonly srLabel?: string | null;
}

export function TagPill({ tone, className, onClick, children, srLabel, ...props }: TagPillProps) {
  const interactive = onClick != null;
  const classes = cn(tagPillVariants({ tone, interactive }), className);
  const content = srLabel ? (
    <>
      {children}
      <span className="sr-only">, {srLabel}</span>
    </>
  ) : (
    children
  );

  if (!interactive) {
    return <span className={classes}>{content}</span>;
  }
  return (
    <button type="button" className={classes} onClick={onClick} {...props}>
      {content}
    </button>
  );
}
