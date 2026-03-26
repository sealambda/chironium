import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type AnthropometricSnapshot,
  deleteAnthropometryEntry,
  fetchAnthropometryHistory,
  updateAnthropometryNotes,
} from "@/features/customers/api/anthropometry-api";
import { EditAnthropometryDialog } from "@/features/customers/ui/detail/edit-anthropometry-dialog";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.anthropometry";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
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
import { Button } from "@/shared/ui/button";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { type Annotation, NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

function formatDate(value: string): string {
  if (!value) {
    return "\u2014";
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

function formatNumber(value: number | undefined): string {
  return value !== undefined ? String(value) : "\u2014";
}

export function AnthropometryHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<AnthropometricSnapshot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnthropometricSnapshot | null>(null);
  const [deleting, setDeleting] = useState(false);

  useDetailModeEffect(<HistoryDetailHeader />, "anthropometry-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "anthropometryHistory", selectedOrg?.id],
    queryFn: () => fetchAnthropometryHistory(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["person", customerId, "anthropometryHistory"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["person", customerId, "anthropometry"],
      }),
    ]);

  const buildUpdatedNotes = (
    current: Annotation[],
    action:
      | { kind: "add"; text: string }
      | { kind: "update"; index: number; text: string }
      | { kind: "delete"; index: number },
  ) => {
    const base = current.map((note) => ({
      text: note.text ?? "",
      ...toAuthorInput(note),
      time: note.time ?? undefined,
    }));

    if (action.kind === "add") {
      const authorInput = toAuthorInput({
        authorReference: user?.id,
        authorString: user?.name,
      });
      return [
        ...base,
        {
          text: action.text,
          ...authorInput,
          time: new Date().toISOString(),
        },
      ];
    }
    if (action.kind === "update") {
      return base.map((note, index) =>
        index === action.index ? { ...note, text: action.text } : note,
      );
    }
    return base.filter((_, index) => index !== action.index);
  };

  const makeNoteHandlers = (snapshot: AnthropometricSnapshot) => {
    const notes = snapshot.notes ?? [];
    return {
      onAddNote: async (text: string) => {
        try {
          await updateAnthropometryNotes(
            snapshot,
            buildUpdatedNotes(notes, { kind: "add", text }),
            selectedOrg?.id ?? "",
          );
          await invalidate();
          toast.success(m.notes_edit_success());
        } catch {
          toast.error(m.onboarding_error());
        }
      },
      onUpdateNote: async (index: number, text: string) => {
        try {
          await updateAnthropometryNotes(
            snapshot,
            buildUpdatedNotes(notes, { kind: "update", index, text }),
            selectedOrg?.id ?? "",
          );
          await invalidate();
          toast.success(m.notes_edit_success());
        } catch {
          toast.error(m.onboarding_error());
        }
      },
      onDeleteNote: async (index: number) => {
        try {
          await updateAnthropometryNotes(
            snapshot,
            buildUpdatedNotes(notes, { kind: "delete", index }),
            selectedOrg?.id ?? "",
          );
          await invalidate();
          toast.success(m.notes_delete_success());
        } catch {
          toast.error(m.onboarding_error());
        }
      },
    };
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAnthropometryEntry(deleteTarget, selectedOrg?.id ?? "");
      await invalidate();
      toast.success(m.anthropometry_delete_success());
      setDeleteTarget(null);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<AnthropometricSnapshot, unknown>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => <SortableHeader column={column}>{m.common_date()}</SortableHeader>,
      cell: ({ getValue }) => formatDate(getValue() as string),
      sortingFn: "datetime",
    },
    {
      accessorKey: "weight",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_weight()}</SortableHeader>
      ),
      cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
    },
    {
      accessorKey: "height",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_height()}</SortableHeader>
      ),
      cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
    },
    {
      accessorKey: "bmi",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_bmi()}</SortableHeader>
      ),
      cell: ({ getValue }) => {
        const value = getValue() as number | undefined;
        return value !== undefined ? value.toFixed(1) : "\u2014";
      },
    },
    {
      accessorKey: "chest",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_chest()}</SortableHeader>
      ),
      cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
    },
    {
      accessorKey: "waist",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_waist()}</SortableHeader>
      ),
      cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
    },
    {
      accessorKey: "hip",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_hip()}</SortableHeader>
      ),
      cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
    },
    {
      accessorKey: "arm",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_arm()}</SortableHeader>
      ),
      cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
    },
    {
      accessorKey: "thigh",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.anthropometry_history_col_thigh()}</SortableHeader>
      ),
      cell: ({ getValue }) => formatNumber(getValue() as number | undefined),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <NotesPopover
            notes={row.original.notes ?? []}
            currentUserId={user?.id ?? undefined}
            currentUserName={user?.name ?? undefined}
            {...makeNoteHandlers(row.original)}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditTarget(row.original)}
            aria-label={m.anthropometry_edit_title()}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDeleteTarget(row.original)}
            aria-label={m.anthropometry_delete_confirm_title()}
            className="text-destructive/60 hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  return (
    <>
      <div className="space-y-4 pt-4 lg:pt-6">
        <h1 className="font-semibold text-lg">{m.anthropometry_history_title()}</h1>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data ?? []}
            initialSorting={[{ id: "date", desc: true }]}
            getRowId={(row) =>
              row.primaryObservationId ??
              row.observations?.weight?.id ??
              row.observations?.height?.id ??
              row.date
            }
            pinFirstColumn
          />
        )}
      </div>

      {editTarget ? (
        <EditAnthropometryDialog
          personId={customerId}
          snapshot={editTarget}
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
        />
      ) : null}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.anthropometry_delete_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.anthropometry_delete_confirm_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? m.common_saving() : m.anthropometry_delete_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
