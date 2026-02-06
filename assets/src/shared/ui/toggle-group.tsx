"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/utils/utils";

const toggleGroupVariants = cva(
  "flex w-full items-center rounded-lg bg-muted p-1 text-muted-foreground",
  {
    variants: {
      size: {
        default: "h-10",
        sm: "h-9",
        lg: "h-11",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const toggleGroupItemVariants = cva(
  [
    "inline-flex min-h-[36px] items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5",
    "font-medium text-sm ring-offset-background transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    // Pressed state styling
    "data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm",
  ].join(" "),
  {
    variants: {
      size: {
        default: "flex-1 text-center",
        sm: "flex-1 text-center text-xs",
        lg: "flex-1 text-center",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

interface ToggleGroupProps extends VariantProps<typeof toggleGroupVariants> {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Toggle group for single selection (like segmented control).
 * Uses Base UI ToggleGroup under the hood.
 */
function ToggleGroup({
  value,
  onValueChange,
  size,
  className,
  children,
  disabled,
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      value={[value]}
      onValueChange={(newValue) => {
        // For single selection, take the last item (the newly pressed one).
        // Don't allow deselecting all items.
        if (newValue.length > 0) {
          onValueChange(newValue[newValue.length - 1]);
        }
      }}
      disabled={disabled}
      className={cn(toggleGroupVariants({ size }), className)}
    >
      {children}
    </ToggleGroupPrimitive>
  );
}

interface ToggleGroupItemProps
  extends VariantProps<typeof toggleGroupItemVariants>,
    Omit<React.ComponentPropsWithoutRef<"button">, "value"> {
  value: string;
  children: React.ReactNode;
}

/**
 * Individual toggle item within a ToggleGroup.
 */
function ToggleGroupItem({
  value,
  size,
  className,
  children,
  disabled,
  ...props
}: ToggleGroupItemProps) {
  return (
    <Toggle
      value={value}
      disabled={disabled}
      className={cn(toggleGroupItemVariants({ size }), className)}
      {...props}
    >
      {children}
    </Toggle>
  );
}

export { ToggleGroup, ToggleGroupItem };
