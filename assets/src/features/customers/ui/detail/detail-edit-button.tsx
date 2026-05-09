import { Pencil } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

interface DetailEditButtonProps
  extends Omit<ComponentProps<typeof Button>, "aria-label" | "children" | "size" | "variant"> {
  ariaLabel: string;
}

export function DetailEditButton({
  ariaLabel,
  className,
  type = "button",
  ...props
}: Readonly<DetailEditButtonProps>) {
  return (
    <Button
      type={type}
      variant="ghost"
      size="icon"
      className={cn("size-7 shrink-0 text-muted-foreground", className)}
      aria-label={ariaLabel}
      {...props}
    >
      <Pencil className="size-4" aria-hidden />
    </Button>
  );
}
