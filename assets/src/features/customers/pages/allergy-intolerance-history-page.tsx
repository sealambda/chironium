import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, PencilIcon, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type AllergyIntoleranceItem,
  fetchAllergyIntolerances,
  updateAllergyIntoleranceCode,
  updateAllergyIntoleranceNotes,
} from "@/features/customers/api/allergy-intolerance-api";
import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.allergies";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import { CodingPopover } from "@/shared/ui/coding-popover";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { type Annotation, NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";

function getAllergyTypeLabel(type: string): string {
  if (type === "ALLERGY") {
    return m.allergy_intolerance_type_allergy();
  }
  if (type === "INTOLERANCE") {
    return m.allergy_intolerance_type_intolerance();
  }
  return type;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function AllergyIntoleranceHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const { patientId } = usePersonDetail(customerId);
  const queryClient = useQueryClient();

  const [editTarget, setEditTarget] = useState<AllergyIntoleranceItem | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useDetailModeEffect(<HistoryDetailHeader />, "allergies-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "allergyIntolerances", selectedOrg?.id],
    queryFn: () => fetchAllergyIntolerances(patientId ?? "", selectedOrg?.id ?? ""),
    enabled: Boolean(patientId && selectedOrg?.id),
  });

  const handleSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed || !editTarget) {
      return;
    }
    setSaving(true);
    try {
      await updateAllergyIntoleranceCode(editTarget.id, trimmed, selectedOrg?.id ?? "");
      await queryClient.invalidateQueries({
        queryKey: ["person", customerId, "allergyIntolerances"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["person", customerId, "patient-detail"],
      });
      toast.success(m.allergy_intolerance_edit_success());
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
        await updateAllergyIntoleranceNotes(
          id,
          buildUpdatedNotes(notes, { kind: "add", text }),
          selectedOrg?.id ?? "",
        );
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "allergyIntolerances"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "patient-detail"],
        });
        toast.success(m.notes_edit_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
    onUpdateNote: async (index: number, text: string) => {
      try {
        await updateAllergyIntoleranceNotes(
          id,
          buildUpdatedNotes(notes, { kind: "update", index, text }),
          selectedOrg?.id ?? "",
        );
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "allergyIntolerances"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "patient-detail"],
        });
        toast.success(m.notes_edit_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
    onDeleteNote: async (index: number) => {
      try {
        await updateAllergyIntoleranceNotes(
          id,
          buildUpdatedNotes(notes, { kind: "delete", index }),
          selectedOrg?.id ?? "",
        );
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "allergyIntolerances"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["person", customerId, "patient-detail"],
        });
        toast.success(m.notes_delete_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
  });

  const columns: ColumnDef<AllergyIntoleranceItem, unknown>[] = [
    {
      id: "type",
      accessorFn: (row) => getAllergyTypeLabel(row.type ?? ""),
      header: ({ column }) => (
        <SortableHeader column={column}>{m.allergy_intolerance_history_col_type()}</SortableHeader>
      ),
    },
    {
      id: "items",
      accessorFn: (row) =>
        row.code?.text ?? row.code?.coding?.[0]?.display ?? EMPTY_VALUE_PLACEHOLDER,
      header: ({ column }) => (
        <SortableHeader column={column}>{m.allergy_intolerance_history_col_items()}</SortableHeader>
      ),
      cell: ({ row }) => {
        const value =
          row.original.code?.text ??
          row.original.code?.coding?.[0]?.display ??
          EMPTY_VALUE_PLACEHOLDER;
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

        return <span>{value}</span>;
      },
    },
    {
      id: "status",
      accessorFn: (row) => formatStatus(row.clinicalStatus),
      header: ({ column }) => (
        <SortableHeader column={column}>
          {m.allergy_intolerance_history_col_status()}
        </SortableHeader>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const codings = (row.original.code?.coding ?? []).map((c) => ({
          system: c.system ?? "",
          code: c.code ?? "",
          display: c.display,
        }));
        return (
          <div className="flex items-center justify-end gap-0.5">
            <CodingPopover codings={codings} />
            <NotesPopover
              notes={row.original.note ?? []}
              currentUserId={user?.id ?? undefined}
              currentUserName={user?.name ?? undefined}
              {...makeNoteHandlers(row.original.id, row.original.note ?? [])}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                const val =
                  row.original.code?.text ?? row.original.code?.coding?.[0]?.display ?? "";
                setEditTarget(row.original);
                setEditText(val);
              }}
            >
              <PencilIcon className="size-3.5" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.allergy_intolerance_history_title()}</h1>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DataTable columns={columns} data={data ?? []} pinFirstColumn />
      )}
    </div>
  );
}
