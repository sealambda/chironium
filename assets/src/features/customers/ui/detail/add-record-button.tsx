import { Plus } from "lucide-react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

interface AddRecordButtonProps {
  readonly onClick: () => void;
  readonly compactOnMobile?: boolean;
  readonly className?: string;
}

export function AddRecordButton({
  onClick,
  compactOnMobile = false,
  className,
}: Readonly<AddRecordButtonProps>) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      aria-label={m.add_record_title()}
      data-testid="add-record-button"
      className={cn(
        "gap-1.5",
        compactOnMobile && "w-8 justify-center px-0 lg:w-auto lg:px-2.5",
        className,
      )}
    >
      <Plus aria-hidden />
      <span className={compactOnMobile ? "hidden lg:inline" : undefined}>
        {m.add_record_title()}
      </span>
    </Button>
  );
}
