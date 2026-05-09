import type { ReactElement, ReactNode } from "react";

import * as m from "@/paraglide/messages";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

interface FormDialogProps {
  /** Controls dialog visibility. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional trigger element rendered via DialogTrigger. */
  trigger?: ReactElement;
  /** Dialog title. */
  title: ReactNode;
  /** Optional description rendered below the title. */
  description?: ReactNode;
  /** Form content rendered between the header and footer. */
  children: ReactNode;
  /** Extra className applied to DialogContent (e.g. `"sm:max-w-lg"`). */
  contentClassName?: string;
  /** Called when the submit button is clicked. */
  onSubmit?: () => void | Promise<void>;
  /** Disables the submit button without implying a loading state. */
  submitDisabled?: boolean;
  /** Shows a loading spinner on the submit button and disables the footer. */
  saving?: boolean;
  /**
   * When provided, a destructive Delete button is rendered on the left side of
   * the footer. The parent is responsible for showing a confirmation dialog.
   */
  onDelete?: () => void;
  /** Disables the Delete button independently of `saving`. */
  deleteDisabled?: boolean;
}

/**
 * Standard layout for CRUD dialogs: trigger, title, optional description,
 * content, and a footer with Cancel / (optional Delete) / Submit.
 */
export function FormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  contentClassName,
  onSubmit,
  submitDisabled = false,
  saving = false,
  onDelete,
  deleteDisabled = false,
}: Readonly<FormDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger !== undefined && <DialogTrigger render={trigger} />}
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter>
          {onDelete !== undefined && (
            <Button
              variant="outline"
              className="mr-auto border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              disabled={saving || deleteDisabled}
            >
              {m.common_delete()}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          {onSubmit ? (
            <Button
              onClick={() => void onSubmit()}
              loading={saving}
              disabled={saving || submitDisabled}
            >
              {saving ? m.common_saving() : m.common_save()}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
