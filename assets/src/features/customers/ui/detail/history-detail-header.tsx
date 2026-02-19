import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface HistoryDetailHeaderProps {
  customerId: string;
}

/**
 * Header for history pages — back arrow navigates to the person detail page.
 */
export function HistoryDetailHeader({ customerId }: Readonly<HistoryDetailHeaderProps>) {
  return (
    <div className="flex w-full items-center">
      <Link to="/customers/$customerId" params={{ customerId }}>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          aria-label="Back to customer"
        >
          <ArrowLeft className="size-5" />
        </Button>
      </Link>
    </div>
  );
}
