import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteObservation,
  fetchObservationsList,
  getObservationDisplayValue,
  type ObservationItem,
  updateObservationNotes,
} from "@/features/customers/api/observations-api";
import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AddObservationDialog } from "@/features/customers/ui/detail/add-observation-dialog";
import { EditObservationDialog } from "@/features/customers/ui/detail/edit-observation-dialog";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.observations";
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
import { MarkdownContent } from "@/shared/ui/markdown-content";
import { type Annotation, NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "\u2014";
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

export function ObservationsListPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { patientId } = usePersonDetail(customerId);
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [editTarget, setEditTarget] = useState<ObservationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ObservationItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useDetailModeEffect(<HistoryDetailHeader customerId={customerId} />, "observations-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "observationsList", selectedOrg?.id],
    queryFn: () => fetchObservationsList(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["person", customerId, "observationsList"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["person", customerId, "observations"],
      }),
    ]);

  const buildUpdatedNotes = (
    current: Annotation[],
    action:
      | { kind: "add"; text: string }
      | { kind: "update"; index: number; text: string }
      | { kind: "delete"; index: number },
  ) => {
    const base = current.map((n) => ({
      text: n.text ?? "",
      ...toAuthorInput(n),
      time: n.time ?? undefined,
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
      return base.map((n, i) => (i === action.index ? { ...n, text: action.text } : n));
    }
    return base.filter((_, i) => i !== action.index);
  };

  const makeNoteHandlers = (obs: ObservationItem) => ({
    onAddNote: async (text: string) => {
      try {
        await updateObservationNotes(
          obs.id,
          buildUpdatedNotes(obs.note ?? [], { kind: "add", text }),
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
        await updateObservationNotes(
          obs.id,
          buildUpdatedNotes(obs.note ?? [], { kind: "update", index, text }),
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
        await updateObservationNotes(
          obs.id,
          buildUpdatedNotes(obs.note ?? [], { kind: "delete", index }),
          selectedOrg?.id ?? "",
        );
        await invalidate();
        toast.success(m.notes_delete_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteObservation(deleteTarget.id, selectedOrg?.id ?? "");
      await invalidate();
      toast.success(m.observations_delete_success());
      setDeleteTarget(null);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setDeleting(false);
    }
  };

  // Columns are defined inside the component so they can close over state/handlers.
  const columns: ColumnDef<ObservationItem, unknown>[] = [
    {
      id: "date",
      accessorKey: "effectiveDateTime",
      header: ({ column }) => <SortableHeader column={column}>{m.common_date()}</SortableHeader>,
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDate(getValue() as string | null)}</span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "value",
      accessorFn: (row) => getObservationDisplayValue(row),
      header: ({ column }) => (
        <SortableHeader column={column}>{m.observations_col_value()}</SortableHeader>
      ),
      cell: ({ row }) => (
        <MarkdownContent content={row.original.valueString ?? ""} className="[&_h1]:mt-0" />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <NotesPopover
            notes={row.original.note ?? []}
            currentUserId={user?.id ?? undefined}
            currentUserName={user?.name ?? undefined}
            {...makeNoteHandlers(row.original)}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditTarget(row.original)}
            aria-label={m.observations_edit_title()}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDeleteTarget(row.original)}
            aria-label={m.observations_delete_confirm_title()}
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
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg">{m.observations_title()}</h1>
          <AddObservationDialog personId={customerId} patientId={patientId}>
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" data-icon="inline-start" />
              {m.observations_add()}
            </Button>
          </AddObservationDialog>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            initialSorting={[{ id: "date", desc: true }]}
            pinFirstColumn
          />
        )}
      </div>

      {editTarget ? (
        <EditObservationDialog
          observation={editTarget}
          personId={customerId}
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        />
      ) : null}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.observations_delete_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.observations_delete_confirm_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? m.common_saving() : m.observations_delete_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
