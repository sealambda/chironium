import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteMedicationStatement,
  fetchMedications,
  type MedicationItem,
  updateMedicationCodeFromTag,
  updateMedicationNotes,
} from "@/features/customers/api/medications-api";
import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { DeleteHistoryEntryDialog } from "@/features/customers/ui/detail/delete-history-entry-dialog";
import { EditHistoryElementDialog } from "@/features/customers/ui/detail/edit-history-element-dialog";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { buildUpdatedClinicalAnnotations } from "@/features/customers/utils/clinical-annotation-notes";
import { formatFhirMedicationStatusLabel } from "@/features/customers/utils/clinical-history-display";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import { terminologyTagFromCodeable } from "@/features/customers/utils/terminology-code-mutation";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.medications";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Button } from "@/shared/ui/button";
import { CodingPopover } from "@/shared/ui/coding-popover";
import { DataTable, SortableHeader } from "@/shared/ui/data-table";
import { type Annotation, NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";

export function MedicationsHistoryPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const { patientId } = usePersonDetail(customerId);
  const queryClient = useQueryClient();

  const [editTarget, setEditTarget] = useState<MedicationItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useDetailModeEffect(<HistoryDetailHeader />, "medications-history");

  const { data, isLoading } = useQuery({
    queryKey: ["person", customerId, "medications", selectedOrg?.id],
    queryFn: () => fetchMedications(patientId ?? "", selectedOrg?.id ?? ""),
    enabled: Boolean(patientId && selectedOrg?.id),
  });

  const invalidateMedicationsQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["person", customerId, "medications"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["person", customerId, "patient-detail"],
    });
  };

  const makeNoteHandlers = (id: string, notes: Annotation[]) => ({
    onAddNote: async (text: string) => {
      try {
        await updateMedicationNotes(
          id,
          buildUpdatedClinicalAnnotations(notes, { kind: "add", text }, { currentUser: user }),
          selectedOrg?.id ?? "",
        );
        await invalidateMedicationsQueries();
        toast.success(m.notes_edit_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
    onUpdateNote: async (index: number, text: string) => {
      try {
        await updateMedicationNotes(
          id,
          buildUpdatedClinicalAnnotations(
            notes,
            { kind: "update", index, text },
            { currentUser: user },
          ),
          selectedOrg?.id ?? "",
        );
        await invalidateMedicationsQueries();
        toast.success(m.notes_edit_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
    onDeleteNote: async (index: number) => {
      try {
        await updateMedicationNotes(
          id,
          buildUpdatedClinicalAnnotations(notes, { kind: "delete", index }, { currentUser: user }),
          selectedOrg?.id ?? "",
        );
        await invalidateMedicationsQueries();
        toast.success(m.notes_delete_success());
      } catch {
        toast.error(m.onboarding_error());
      }
    },
  });

  const columns: ColumnDef<MedicationItem, unknown>[] = [
    {
      id: "element",
      accessorFn: (row) =>
        displayTextFromCodeableConcept(row.medication) || EMPTY_VALUE_PLACEHOLDER,
      header: ({ column }) => <SortableHeader column={column}>{m.common_element()}</SortableHeader>,
      cell: ({ row }) => (
        <span>
          {displayTextFromCodeableConcept(row.original.medication) || EMPTY_VALUE_PLACEHOLDER}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => formatFhirMedicationStatusLabel(row.status),
      header: ({ column }) => <SortableHeader column={column}>{m.common_status()}</SortableHeader>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const codings = (row.original.medication?.coding ?? []).map((c) => ({
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
        );
      },
      enableSorting: false,
    },
  ];

  const initialEditTag = editTarget ? terminologyTagFromCodeable(editTarget.medication) : null;

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      <h1 className="font-semibold text-lg">{m.medication_history_title()}</h1>
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
        conceptContext="MEDICATION"
        initialTag={initialEditTag}
        saving={saving}
        onSave={async (tag) => {
          if (!editTarget) {
            return;
          }
          setSaving(true);
          try {
            await updateMedicationCodeFromTag(editTarget.id, tag, selectedOrg?.id ?? "");
            await invalidateMedicationsQueries();
            toast.success(m.medication_edit_success());
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
            await deleteMedicationStatement(deleteTargetId, selectedOrg?.id ?? "");
            await invalidateMedicationsQueries();
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
