import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CreditCard,
  FileText,
  Pill,
  RefreshCcwDot,
  Scale,
  ShieldAlert,
  Stethoscope,
  Target,
  Utensils,
} from "lucide-react";
import { useCallback } from "react";

import { AddAnthropometryDialog } from "@/features/customers/ui/detail/add-anthropometry-dialog";
import { AddConditionsDialog } from "@/features/customers/ui/detail/add-conditions-dialog";
import { AddFoodPreferenceDialog } from "@/features/customers/ui/detail/add-food-preference-dialog";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import { AddMedicationsDialog } from "@/features/customers/ui/detail/add-medications-dialog";
import { AddMenstrualCycleDialog } from "@/features/customers/ui/detail/add-menstrual-cycle-dialog";
import { AddObservationDialog } from "@/features/customers/ui/detail/add-observation-dialog";
import { AllergyDetailDialog } from "@/features/customers/ui/detail/allergy-detail-dialog";
import { EditSubscriptionDialog } from "@/features/customers/ui/detail/edit-subscription-dialog";
import { ReviewTaskDialog } from "@/features/customers/ui/detail/review-task-dialog";
import * as m from "@/paraglide/messages";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/utils/utils";

export type RecordType =
  | "measurement"
  | "goal"
  | "note"
  | "reminder"
  | "condition"
  | "medication"
  | "allergy"
  | "menstrual_cycle"
  | "food_preferences"
  | "subscription";

/** Paraglide message functions return the resolved string for the active locale. */
type Message = () => string;

interface RecordTypeConfig {
  readonly id: RecordType;
  readonly icon: LucideIcon;
  readonly bgClassName: string;
  readonly iconClassName: string;
  readonly label: Message;
  readonly desc: Message;
  readonly disabled?: boolean;
}

interface RecordTypeGroup {
  readonly groupLabel: Message;
  readonly types: readonly RecordTypeConfig[];
}

const RECORD_TYPE_GROUPS: readonly RecordTypeGroup[] = [
  {
    groupLabel: m.add_record_group_tracking,
    types: [
      {
        id: "note",
        icon: FileText,
        bgClassName: "bg-slate-100 dark:bg-slate-800",
        iconClassName: "text-slate-700",
        label: m.add_record_tile_note,
        desc: m.add_record_note_desc,
      },
      {
        id: "reminder",
        icon: CalendarClock,
        bgClassName: "bg-amber-100 dark:bg-amber-900",
        iconClassName: "text-amber-700",
        label: m.add_record_tile_reminder,
        desc: m.add_record_reminder_desc,
      },
      {
        id: "measurement",
        icon: Scale,
        bgClassName: "bg-slate-100 dark:bg-slate-800",
        iconClassName: "text-slate-700",
        label: m.add_record_tile_measurement,
        desc: m.add_record_measurement_desc,
      },
      {
        id: "goal",
        icon: Target,
        bgClassName: "bg-sky-100 dark:bg-sky-900",
        iconClassName: "text-sky-700",
        label: m.add_record_tile_goal,
        desc: m.add_record_goal_desc,
      },
      {
        id: "subscription",
        icon: CreditCard,
        bgClassName: "bg-violet-100 dark:bg-violet-900",
        iconClassName: "text-violet-700",
        label: m.add_record_tile_subscription,
        desc: m.add_record_subscription_desc,
      },
    ],
  },
  {
    groupLabel: m.add_record_group_health,
    types: [
      {
        id: "condition",
        icon: Stethoscope,
        bgClassName: "bg-red-100 dark:bg-red-900",
        iconClassName: "text-red-700",
        label: m.add_record_tile_condition,
        desc: m.add_record_condition_desc,
      },
      {
        id: "medication",
        icon: Pill,
        bgClassName: "bg-blue-100 dark:bg-blue-900",
        iconClassName: "text-blue-700",
        label: m.add_record_tile_medication,
        desc: m.add_record_medication_desc,
      },
      {
        id: "allergy",
        icon: ShieldAlert,
        bgClassName: "bg-orange-100 dark:bg-orange-900",
        iconClassName: "text-orange-700",
        label: m.add_record_tile_allergy,
        desc: m.add_record_allergy_desc,
      },
      {
        id: "menstrual_cycle",
        icon: RefreshCcwDot,
        bgClassName: "bg-rose-100 dark:bg-rose-900",
        iconClassName: "text-rose-700",
        label: m.add_record_tile_menstrual_cycle,
        desc: m.add_record_menstrual_cycle_desc,
      },
    ],
  },
  {
    groupLabel: m.add_record_group_nutrition,
    types: [
      {
        id: "food_preferences",
        icon: Utensils,
        bgClassName: "bg-emerald-100 dark:bg-emerald-900",
        iconClassName: "text-emerald-700",
        label: m.add_record_tile_food_pref,
        desc: m.add_record_food_pref_desc,
      },
    ],
  },
];

function tileGridClassName(count: number): string {
  if (count >= 5) {
    // 6-col ghost grid: first 3 items span 2 cols each (equal thirds),
    // last 2 items span 3 cols each (equal halves) → clean 3+2 row split.
    return "grid grid-cols-6 gap-3";
  }
  if (count === 4) {
    return "grid grid-cols-2 gap-3 sm:grid-cols-4";
  }
  if (count === 3) {
    return "grid grid-cols-2 gap-3 sm:grid-cols-3";
  }
  if (count === 1) {
    return "flex justify-center";
  }
  return "grid grid-cols-2 gap-3";
}

function tileItemClassName(index: number, total: number): string {
  if (total >= 5) {
    return index < 3 ? "col-span-2" : "col-span-3";
  }
  if (total === 1) {
    return "w-full sm:w-1/2";
  }
  return "";
}

interface AddRecordDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly activeType: RecordType | null;
  readonly onActiveTypeChange: (type: RecordType | null) => void;
  readonly currentSubscription?: SubscriptionRecord;
}

export function AddRecordDialog({
  personId,
  patientId,
  open,
  onOpenChange,
  activeType,
  onActiveTypeChange,
  currentSubscription,
}: AddRecordDialogProps) {
  const selectType = (type: RecordType) => {
    onOpenChange(false);
    onActiveTypeChange(type);
  };

  const closeDialog = useCallback(() => onActiveTypeChange(null), [onActiveTypeChange]);
  const handleChildOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        closeDialog();
      }
    },
    [closeDialog],
  );

  return (
    <>
      <AddAnthropometryDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "measurement"}
        onOpenChange={handleChildOpenChange}
      />
      <AddGoalDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "goal"}
        onOpenChange={handleChildOpenChange}
      />
      <AddObservationDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "note"}
        onOpenChange={handleChildOpenChange}
      />
      <ReviewTaskDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "reminder"}
        onOpenChange={handleChildOpenChange}
      />
      <AddConditionsDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "condition"}
        onOpenChange={handleChildOpenChange}
      />
      <AddMedicationsDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "medication"}
        onOpenChange={handleChildOpenChange}
      />
      <AddMenstrualCycleDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "menstrual_cycle"}
        onOpenChange={handleChildOpenChange}
      />
      <AllergyDetailDialog
        mode="create"
        personId={personId}
        patientId={patientId}
        organizationId=""
        open={activeType === "allergy"}
        onOpenChange={handleChildOpenChange}
      />
      <AddFoodPreferenceDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "food_preferences"}
        onOpenChange={handleChildOpenChange}
      />
      <EditSubscriptionDialog
        personId={personId}
        currentSubscription={currentSubscription}
        open={activeType === "subscription"}
        onOpenChange={handleChildOpenChange}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>{m.add_record_title()}</DialogTitle>
            <DialogDescription>{m.add_record_subtitle()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {RECORD_TYPE_GROUPS.map(({ groupLabel, types }) => {
              const groupLabelText = groupLabel();

              return (
                <div key={groupLabelText}>
                  <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {groupLabelText}
                  </p>
                  <div className={tileGridClassName(types.length)}>
                    {types.map(
                      (
                        { id, icon: Icon, bgClassName, iconClassName, label, desc, disabled },
                        index,
                      ) => {
                        const labelText = label();
                        const descText = desc();

                        return (
                          <button
                            key={id}
                            type="button"
                            aria-label={labelText}
                            aria-disabled={disabled}
                            disabled={disabled}
                            onClick={() => selectType(id)}
                            className={cn(
                              "flex h-full flex-col items-center rounded-xl border border-border/50 bg-card p-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                              disabled
                                ? "cursor-not-allowed opacity-50"
                                : "hover:border-primary/30 hover:bg-primary/5",
                              tileItemClassName(index, types.length),
                            )}
                          >
                            <div
                              className={cn(
                                "mb-2 flex size-10 shrink-0 items-center justify-center rounded-full",
                                bgClassName,
                              )}
                            >
                              <Icon className={cn("size-5", iconClassName)} aria-hidden />
                            </div>
                            <p className="font-semibold text-foreground text-xs uppercase tracking-wide">
                              {labelText}
                            </p>
                            <p className="mt-0.5 text-muted-foreground text-xs">{descText}</p>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
