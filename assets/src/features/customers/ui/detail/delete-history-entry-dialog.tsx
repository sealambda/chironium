import * as m from "@/paraglide/messages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

interface DeleteHistoryEntryDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly deleting: boolean;
  readonly onConfirm: () => void | Promise<void>;
}

export function DeleteHistoryEntryDialog({
  open,
  onOpenChange,
  deleting,
  onConfirm,
}: DeleteHistoryEntryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.history_entry_delete_confirm_title()}</AlertDialogTitle>
          <AlertDialogDescription>{m.history_entry_delete_confirm_desc()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={deleting}
          >
            {deleting ? m.common_saving() : m.history_entry_delete_confirm_action()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
