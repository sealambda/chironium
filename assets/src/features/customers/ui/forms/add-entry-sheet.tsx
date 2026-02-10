import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";

interface AddEntrySheetProps {
  /** Sheet title */
  title: string;
  /** Sheet description below title */
  description?: string;
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** ID of the form element to target with the submit button */
  formId: string;
  /** Whether a mutation is pending */
  isPending?: boolean;
  /** Form content */
  children: ReactNode;
}

/**
 * Reusable side sheet wrapper for add-entry forms.
 * Fixed header, scrollable content, sticky footer with cancel/submit.
 */
export function AddEntrySheet({
  title,
  description,
  open,
  onOpenChange,
  formId,
  isPending,
  children,
}: Readonly<AddEntrySheetProps>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        {/* Fixed header */}
        <SheetHeader className="px-4 pt-4">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>

        {/* Sticky footer */}
        <div className="border-t bg-background px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="order-2 sm:order-1"
            >
              {m.common_cancel()}
            </Button>
            <Button type="submit" form={formId} disabled={isPending} className="order-1 sm:order-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? m.common_saving() : m.form_submit()}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
