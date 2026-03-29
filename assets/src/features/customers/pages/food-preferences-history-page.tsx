import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type FoodPreferenceHistoryItem,
  fetchFoodPreferencesHistory,
  terminologyTagFromFoodHistoryItem,
  updateFoodObservationFromTag,
  updateFoodObservationNotes,
} from "@/features/customers/api/food-preferences-api";
import { deleteObservation } from "@/features/customers/api/observations-api";
import { DeleteHistoryEntryDialog } from "@/features/customers/ui/detail/delete-history-entry-dialog";
import { EditHistoryElementDialog } from "@/features/customers/ui/detail/edit-history-element-dialog";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { formatClinicalHistoryDate } from "@/features/customers/utils/clinical-history-display";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.food-preferences";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import { CodingPopover } from "@/shared/ui/coding-popover";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { type Annotation, NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";

function getDietTypeLabel(type: FoodPreferenceHistoryItem["type"]): string {
  if (type === "inclusion") {
    return m.food_preferences_includes_label();
  }
  return m.food_preferences_avoids_label();
}

export function FoodPreferencesHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [editTarget, setEditTarget] = useState<FoodPreferenceHistoryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useDetailModeEffect(<HistoryDetailHeader />, "food-preferences-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "foodPreferencesHistory", selectedOrg?.id],
    queryFn: () => fetchFoodPreferencesHistory(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  const invalidateFoodHistory = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["person", customerId, "foodPreferencesHistory"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["person", customerId, "foodPreferences"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["person", customerId, "patient-detail"],
    });
  };

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

  const makeNoteHandlers = (id: string, notes: Annotation[]) => ({
    onAddNote: async (text: string) => {
      try {
        await updateFoodObservationNotes(
          id,
          buildUpdatedNotes(notes, { kind: "add", text }),
          selectedOrg?.id ?? "",
        );
        await invalidateFoodHistory();
        toast.success(m.notes_edit_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
    onUpdateNote: async (index: number, text: string) => {
      try {
        await updateFoodObservationNotes(
          id,
          buildUpdatedNotes(notes, { kind: "update", index, text }),
          selectedOrg?.id ?? "",
        );
        await invalidateFoodHistory();
        toast.success(m.notes_edit_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
    onDeleteNote: async (index: number) => {
      try {
        await updateFoodObservationNotes(
          id,
          buildUpdatedNotes(notes, { kind: "delete", index }),
          selectedOrg?.id ?? "",
        );
        await invalidateFoodHistory();
        toast.success(m.notes_delete_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
  });

  const columns: ColumnDef<FoodPreferenceHistoryItem, unknown>[] = [
    {
      id: "element",
      accessorKey: "items",
      header: ({ column }) => <SortableHeader column={column}>{m.common_element()}</SortableHeader>,
      cell: ({ row }) => <span>{row.original.items || EMPTY_VALUE_PLACEHOLDER}</span>,
    },
    {
      id: "type",
      accessorFn: (row) => getDietTypeLabel(row.type),
      header: ({ column }) => <SortableHeader column={column}>{m.common_type()}</SortableHeader>,
      cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue() as string}</span>,
    },
    {
      id: "date",
      accessorKey: "date",
      header: ({ column }) => <SortableHeader column={column}>{m.common_date()}</SortableHeader>,
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">
          {formatClinicalHistoryDate(getValue() as string | null)}
        </span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <CodingPopover codings={row.original.codings} />
          <NotesPopover
            notes={row.original.notes}
            currentUserId={user?.id ?? undefined}
            currentUserName={user?.name ?? undefined}
            {...makeNoteHandlers(row.original.id, row.original.notes)}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditTarget(row.original);
              setEditOpen(true);
            }}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDeleteTargetId(row.original.id)}
            aria-label={m.history_entry_delete_confirm_title()}
            className="text-destructive/60 hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  const initialEditTag = editTarget ? terminologyTagFromFoodHistoryItem(editTarget) : null;

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.food_preferences_history_title()}</h1>
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
          initialSorting={[{ id: "element", desc: false }]}
          getRowId={(row) => row.id}
          pinFirstColumn
        />
      )}

      <EditHistoryElementDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditTarget(null);
          }
        }}
        organizationId={selectedOrg?.id ?? ""}
        conceptContext="FOOD"
        initialTag={initialEditTag}
        saving={saving}
        onSave={async (tag) => {
          if (!editTarget) {
            return;
          }
          setSaving(true);
          try {
            await updateFoodObservationFromTag(editTarget.id, tag, selectedOrg?.id ?? "");
            await invalidateFoodHistory();
            toast.success(m.food_preferences_edit_success());
            setEditOpen(false);
            setEditTarget(null);
          } catch {
            toast.error(m.onboarding_error());
          } finally {
            setSaving(false);
          }
        }}
      />

      <DeleteHistoryEntryDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null);
          }
        }}
        deleting={deleting}
        onConfirm={async () => {
          if (!deleteTargetId) {
            return;
          }
          setDeleting(true);
          try {
            await deleteObservation(deleteTargetId, selectedOrg?.id ?? "");
            await invalidateFoodHistory();
            toast.success(m.history_entry_delete_success());
            setDeleteTargetId(null);
          } catch {
            toast.error(m.onboarding_error());
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
