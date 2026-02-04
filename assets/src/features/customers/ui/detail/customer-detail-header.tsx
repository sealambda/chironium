import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";

/**
 * Minimal customer detail header for the top navigation bar.
 * Contains only the back button - customer info is now in the main content area.
 */
export function CustomerDetailHeader() {
  return (
    <div className="flex w-full items-center">
      <Link to="/customers">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          aria-label="Back to customers"
        >
          <ArrowLeft className="size-5" />
        </Button>
      </Link>
    </div>
  );
}
