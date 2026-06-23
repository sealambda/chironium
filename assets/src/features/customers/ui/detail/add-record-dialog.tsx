import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CreditCard,
  FileText,
  Pill,
  RefreshCcwDot,
  Salad,
  Scale,
  ShieldAlert,
  Stethoscope,
  Tablets,
  Target,
  Utensils,
} from "lucide-react";
import { useCallback } from "react";

import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import { AddAnthropometryDialog } from "@/features/customers/ui/detail/add-anthropometry-dialog";
import { AddConditionsDialog } from "@/features/customers/ui/detail/add-conditions-dialog";
import { AddFoodPreferenceDialog } from "@/features/customers/ui/detail/add-food-preference-dialog";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import { AddMedicationsDialog } from "@/features/customers/ui/detail/add-medications-dialog";
import { AddMenstrualCycleDialog } from "@/features/customers/ui/detail/add-menstrual-cycle-dialog";
import { AddObservationDialog } from "@/features/customers/ui/detail/add-observation-dialog";
import { AddTaskReminderDialog } from "@/features/customers/ui/detail/add-task-reminder-dialog";
import { AllergyDetailDialog } from "@/features/customers/ui/detail/allergy-detail-dialog";
import { EditSubscriptionDialog } from "@/features/customers/ui/detail/edit-subscription-dialog";
import { NutritionPlanDetailDialog } from "@/features/customers/ui/detail/nutrition-plan-detail-dialog";
import { PrescriptionDetailDialog } from "@/features/customers/ui/detail/prescription-detail-dialog";
import * as m from "@/paraglide/messages";
import type { AdministrativeGender } from "@/shared/types/schema-enums";
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
  | "prescription"
  | "allergy"
  | "menstrual_cycle"
  | "food_preferences"
  | "nutrition"
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
  readonly priority?: "primary";
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
        bgClassName: "bg-muted",
        iconClassName: "text-muted-foreground",
        label: m.add_record_tile_note,
        desc: m.add_record_note_desc,
        priority: "primary",
      },
      {
        id: "measurement",
        icon: Scale,
        bgClassName: "bg-muted",
        iconClassName: "text-muted-foreground",
        label: m.add_record_tile_measurement,
        desc: m.add_record_measurement_desc,
        priority: "primary",
      },
      {
        id: "reminder",
        icon: CalendarClock,
        bgClassName: "bg-warning-muted",
        iconClassName: "text-warning-muted-foreground",
        label: m.add_record_tile_reminder,
        desc: m.add_record_reminder_desc,
      },
      {
        id: "goal",
        icon: Target,
        bgClassName: "bg-info-muted",
        iconClassName: "text-info-muted-foreground",
        label: m.add_record_tile_goal,
        desc: m.add_record_goal_desc,
      },
      {
        id: "subscription",
        icon: CreditCard,
        bgClassName: "bg-primary/10",
        iconClassName: "text-primary",
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
        bgClassName: "bg-destructive-muted",
        iconClassName: "text-destructive-muted-foreground",
        label: m.add_record_tile_condition,
        desc: m.add_record_condition_desc,
      },
      {
        id: "medication",
        icon: Pill,
        bgClassName: "bg-info-muted",
        iconClassName: "text-info-muted-foreground",
        label: m.add_record_tile_medication,
        desc: m.add_record_medication_desc,
      },
      {
        id: "prescription",
        icon: Tablets,
        bgClassName: "bg-info-muted",
        iconClassName: "text-info-muted-foreground",
        label: m.add_record_tile_prescription,
        desc: m.add_record_prescription_desc,
      },
      {
        id: "allergy",
        icon: ShieldAlert,
        bgClassName: "bg-warning-muted",
        iconClassName: "text-warning-muted-foreground",
        label: m.add_record_tile_allergy,
        desc: m.add_record_allergy_desc,
      },
      {
        id: "menstrual_cycle",
        icon: RefreshCcwDot,
        bgClassName: "bg-primary/10",
        iconClassName: "text-primary",
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
        bgClassName: "bg-success-muted",
        iconClassName: "text-success-muted-foreground",
        label: m.add_record_tile_food_pref,
        desc: m.add_record_food_pref_desc,
      },
      {
        id: "nutrition",
        icon: Salad,
        bgClassName: "bg-success-muted",
        iconClassName: "text-success-muted-foreground",
        label: m.add_record_tile_nutrition,
        desc: m.add_record_nutrition_desc,
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

function tileItemClassName(type: RecordTypeConfig, total: number): string {
  if (total >= 5) {
    return type.priority === "primary" ? "col-span-3" : "col-span-2";
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
  readonly latestAnthropometry?: AnthropometricSnapshot | null;
  readonly currentSubscription?: SubscriptionRecord;
  readonly dateOfBirth?: string | null;
  readonly sex?: AdministrativeGender | null;
}

export function AddRecordDialog({
  personId,
  patientId,
  open,
  onOpenChange,
  activeType,
  onActiveTypeChange,
  latestAnthropometry,
  currentSubscription,
  dateOfBirth,
  sex,
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
        latestAnthropometry={latestAnthropometry}
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
      <AddTaskReminderDialog
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
      <PrescriptionDetailDialog
        mode="create"
        personId={personId}
        patientId={patientId}
        organizationId=""
        open={activeType === "prescription"}
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
      <NutritionPlanDetailDialog
        mode="add"
        personId={personId}
        patientId={patientId}
        organizationId=""
        weightKg={latestAnthropometry?.weight ?? null}
        heightCm={latestAnthropometry?.height ?? null}
        dateOfBirth={dateOfBirth}
        sex={sex}
        open={activeType === "nutrition"}
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

          <div className="flex flex-col gap-5">
            {RECORD_TYPE_GROUPS.map(({ groupLabel, types }) => {
              const groupLabelText = groupLabel();

              return (
                <div key={groupLabelText}>
                  <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {groupLabelText}
                  </p>
                  <div className={tileGridClassName(types.length)}>
                    {types.map((type) => {
                      const {
                        id,
                        icon: Icon,
                        bgClassName,
                        iconClassName,
                        label,
                        desc,
                        disabled,
                      } = type;
                      const labelText = label();
                      const descText = desc();

                      return (
                        <button
                          key={id}
                          type="button"
                          data-testid={`add-record-tile-${id}`}
                          aria-label={labelText}
                          aria-disabled={disabled}
                          disabled={disabled}
                          onClick={() => selectType(id)}
                          className={cn(
                            "flex h-full cursor-pointer flex-col items-center rounded-xl border border-border/50 bg-card p-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                            disabled
                              ? "cursor-not-allowed opacity-50"
                              : "hover:border-primary/30 hover:bg-primary/5",
                            tileItemClassName(type, types.length),
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
                    })}
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
