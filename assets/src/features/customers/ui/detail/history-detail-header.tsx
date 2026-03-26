import { BackButton } from "@/shared/ui/back-button";

/**
 * Header for history pages — back arrow navigates to the person detail page.
 */
export function HistoryDetailHeader() {
  return (
    <div className="flex w-full items-center">
      <BackButton />
    </div>
  );
}
