import { PlusIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface CardAddButtonProps {
  label: string;
  className?: string;
}

export function CardAddButton({
  label,
  className,
}: Readonly<CardAddButtonProps>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      aria-label={label}
    >
      <PlusIcon className="size-4 xl:mr-1" />
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}
