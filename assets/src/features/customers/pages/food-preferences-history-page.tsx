import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Check, PencilIcon, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type FoodPreferenceHistoryItem,
  fetchFoodPreferencesHistory,
  updateFoodObservationNotes,
  updateFoodObservationText,
} from "@/features/customers/api/food-preferences-api";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
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
import { getDateLocale } from "@/shared/utils/date-locale";

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "\u2014";
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

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
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useDetailModeEffect(<HistoryDetailHeader />, "food-preferences-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "foodPreferencesHistory", selectedOrg?.id],
    queryFn: () => fetchFoodPreferencesHistory(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  const handleSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed || !editTarget) {
      return;
    }
    setSaving(true);
    try {
      await updateFoodObservationText(editTarget.id, trimmed, selectedOrg?.id ?? "");
      await queryClient.invalidateQueries({
        queryKey: ["person", customerId, "foodPreferencesHistory"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["person", customerId, "foodPreferences"],
      });
      toast.success(m.food_preferences_edit_success());
      setEditTarget(null);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
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
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "foodPreferencesHistory"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "foodPreferences"],
        });
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
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "foodPreferencesHistory"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "foodPreferences"],
        });
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
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "foodPreferencesHistory"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "foodPreferences"],
        });
        toast.success(m.notes_delete_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
  });

  const columns: ColumnDef<FoodPreferenceHistoryItem, unknown>[] = [
    {
      id: "date",
      accessorKey: "date",
      header: ({ column }) => <SortableHeader column={column}>{m.common_date()}</SortableHeader>,
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDate(getValue() as string | null)}</span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "type",
      accessorFn: (row) => getDietTypeLabel(row.type),
      header: ({ column }) => (
        <SortableHeader column={column}>{m.food_preferences_history_col_type()}</SortableHeader>
      ),
      cell: ({ getValue }) => <span className="whitespace-nowrap">{getValue() as string}</span>,
    },
    {
      id: "items",
      accessorKey: "items",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.food_preferences_history_col_items()}</SortableHeader>
      ),
      cell: ({ row }) => {
        const value = row.original.items;
        const isEditing = editTarget?.id === row.original.id;

        if (isEditing) {
          return (
            <div className="flex items-center gap-1">
              <input
                // biome-ignore lint/a11y/noAutofocus: focus expected when entering edit mode
                autoFocus
                className="min-w-40 rounded border px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSave();
                  }
                  if (e.key === "Escape") {
                    setEditTarget(null);
                  }
                }}
                disabled={saving}
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => void handleSave()}
                disabled={saving || !editText.trim()}
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setEditTarget(null)}
                disabled={saving}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          );
        }

        return <span>{value || "\u2014"}</span>;
      },
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
              setEditText(row.original.items);
            }}
          >
            <PencilIcon className="size-3.5" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ];

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
          initialSorting={[{ id: "date", desc: true }]}
          getRowId={(row) => row.id}
          pinFirstColumn
        />
      )}
    </div>
  );
}
