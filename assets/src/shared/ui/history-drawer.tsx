import { XIcon } from "lucide-react";
import type * as React from "react";

import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
import { cn } from "@/shared/utils";

export interface HistoryDrawerProps {
  /** Title displayed in the drawer header */
  title: string;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Callback when Add button is clicked */
  onAdd?: () => void;
  /** Label for the Add button (defaults to "Add") */
  addButtonLabel?: string;
  /** Table or content to display in the scrollable area */
  children: React.ReactNode;
  /** Additional class names for the drawer content */
  className?: string;
}

/**
 * Reusable drawer component for displaying history tables on the customer detail screen.
 * Features a fixed header with title and optional Add button, and a scrollable content area.
 */
export function HistoryDrawer({
  title,
  isOpen,
  onClose,
  onAdd,
  addButtonLabel = "Add",
  children,
  className,
}: Readonly<HistoryDrawerProps>) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} direction="bottom">
      <DrawerContent
        className={cn("flex max-h-[85vh] w-full flex-col", className)}
      >
        {/* Fixed header */}
        <DrawerHeader className="flex flex-row items-center justify-between border-b">
          <DrawerTitle>{title}</DrawerTitle>
          <div className="flex items-center gap-2">
            {onAdd && (
              <Button size="sm" onClick={onAdd}>
                {addButtonLabel}
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
