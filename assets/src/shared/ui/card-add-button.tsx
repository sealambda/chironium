import type { ComponentPropsWithoutRef } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface CardAddButtonProps extends Omit<ComponentPropsWithoutRef<typeof Button>, "children"> {
  label: string;
}

export function CardAddButton({ label, className, ...props }: Readonly<CardAddButtonProps>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      aria-label={label}
      type="button"
      {...props}
    >
      <PlusIcon className="size-4 xl:mr-1" />
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}
