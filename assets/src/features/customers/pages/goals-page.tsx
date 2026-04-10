import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteGoal, fetchAllGoals, type GoalRecord } from "@/features/customers/api/goals-api";
import { usePersonDetail } from "@/features/customers/hooks/use-person-detail";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import { HistoryDetailHeader } from "@/features/customers/ui/detail/history-detail-header";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId_.goals";
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
import { NotesPopover } from "@/shared/ui/notes-popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";
import { EMPTY_VALUE_PLACEHOLDER } from "@/shared/utils/display-value";
import { personQueryKeys } from "@/shared/utils/query-keys";

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE_PLACEHOLDER;
  }
  return format(new Date(value), "PP", { locale: getDateLocale() });
}

function getGoalPriorityLabel(priority: GoalRecord["priority"]): string {
  if (priority === "HIGH_PRIORITY") {
    return m.goals_priority_high();
  }
  if (priority === "MEDIUM_PRIORITY") {
    return m.goals_priority_medium();
  }
  if (priority === "LOW_PRIORITY") {
    return m.goals_priority_low();
  }
  return EMPTY_VALUE_PLACEHOLDER;
}

function getGoalCategoryLabel(category: GoalRecord["category"]): string {
  if (!category?.length) {
    return EMPTY_VALUE_PLACEHOLDER;
  }

  return category
    .map((item) => {
      if (item === "DIETARY") {
        return m.goals_category_dietary();
      }
      if (item === "BEHAVIORAL") {
        return m.goals_category_behavioral();
      }
      if (item === "NURSING") {
        return m.goals_category_nursing();
      }
      if (item === "PHYSIOTHERAPY") {
        return m.goals_category_physiotherapy();
      }
      if (item === "SAFETY") {
        return m.goals_category_safety();
      }
      return item;
    })
    .join(", ");
}

export function GoalsPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const { patientId } = usePersonDetail(customerId);
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<GoalRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useDetailModeEffect(<HistoryDetailHeader />, "goals");

  const { data, isLoading } = useQuery({
    queryKey: personQueryKeys.goals(customerId, selectedOrg?.id ?? ""),
    queryFn: () => fetchAllGoals(customerId, selectedOrg?.id ?? ""),
    enabled: Boolean(customerId && selectedOrg?.id),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: personQueryKeys.goalsScope(customerId),
      }),
      queryClient.invalidateQueries({
        queryKey: personQueryKeys.patientDetailScope(customerId),
      }),
    ]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await deleteGoal(deleteTarget.id, selectedOrg?.id ?? "");
      await invalidate();
      toast.success(m.goals_delete_success());
      setDeleteTarget(null);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<GoalRecord, unknown>[] = [
    {
      accessorFn: (row) => row.description.text,
      id: "description",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.goals_col_description()}</SortableHeader>
      ),
      cell: ({ row }) => <span>{row.original.description.text || EMPTY_VALUE_PLACEHOLDER}</span>,
    },
    {
      id: "priority",
      accessorFn: (row) => getGoalPriorityLabel(row.priority),
      header: ({ column }) => (
        <SortableHeader column={column}>{m.goals_col_priority()}</SortableHeader>
      ),
      cell: ({ row }) => <span>{getGoalPriorityLabel(row.original.priority)}</span>,
    },
    {
      id: "category",
      accessorFn: (row) => getGoalCategoryLabel(row.category),
      header: ({ column }) => (
        <SortableHeader column={column}>{m.goals_col_category()}</SortableHeader>
      ),
      cell: ({ row }) => <span>{getGoalCategoryLabel(row.original.category)}</span>,
    },
    {
      id: "startDate",
      accessorKey: "startDate",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.goals_col_start_date()}</SortableHeader>
      ),
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDate(getValue() as string | null)}</span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: ({ column }) => (
        <SortableHeader column={column}>{m.goals_col_due_date()}</SortableHeader>
      ),
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDate(getValue() as string | null)}</span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <NotesPopover notes={row.original.note ?? []} />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditTarget(row.original)}
            aria-label={m.goals_edit_title()}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDeleteTarget(row.original)}
            aria-label={m.goals_delete_confirm_title()}
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
          <h1 className="font-semibold text-lg">{m.goals_title()}</h1>
          <AddGoalDialog personId={customerId} patientId={patientId}>
            <Button variant="outline" size="sm">
              <PlusIcon className="size-4" data-icon="inline-start" />
              {m.goals_add()}
            </Button>
          </AddGoalDialog>
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
            data={data ?? []}
            getRowId={(row) => row.id}
            pinFirstColumn
          />
        )}
      </div>

      {editTarget ? (
        <AddGoalDialog
          personId={customerId}
          patientId={patientId}
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
          editGoal={editTarget}
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
            <AlertDialogTitle>{m.goals_delete_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.goals_delete_confirm_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? m.common_saving() : m.goals_delete_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
