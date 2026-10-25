import { useCallback } from "react";

import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import { AddAnthropometryDialog } from "@/features/customers/ui/detail/add-anthropometry-dialog";
import { AddConditionsDialog } from "@/features/customers/ui/detail/add-conditions-dialog";
import { AddFoodPreferenceDialog } from "@/features/customers/ui/detail/add-food-preference-dialog";
import { AddGoalDialog } from "@/features/customers/ui/detail/add-goal-dialog";
import { AddMedicationsDialog } from "@/features/customers/ui/detail/add-medications-dialog";
import { AddMenstrualCycleDialog } from "@/features/customers/ui/detail/add-menstrual-cycle-dialog";
import { AddObservationDialog } from "@/features/customers/ui/detail/add-observation-dialog";
import {
  RECORD_TYPE_GROUPS,
  type RecordType,
  tileGridClassName,
  tileItemClassName,
} from "@/features/customers/ui/detail/add-record-types";
import { AddTaskReminderDialog } from "@/features/customers/ui/detail/add-task-reminder-dialog";
import { AllergyDetailDialog } from "@/features/customers/ui/detail/allergy-detail-dialog";
import { EditSubscriptionDialog } from "@/features/customers/ui/detail/edit-subscription-dialog";
import { NutritionPlanDetailDialog } from "@/features/customers/ui/detail/nutrition-plan-detail-dialog";
import { PrescriptionDetailDialog } from "@/features/customers/ui/detail/prescription-detail-dialog";
import { QuestionnaireFillDialog } from "@/features/questionnaires/ui/fill/questionnaire-fill-dialog";
import { SendQuestionnaireDialog } from "@/features/questionnaires/ui/request/send-questionnaire-dialog";
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
      <QuestionnaireFillDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "questionnaire"}
        onOpenChange={handleChildOpenChange}
      />
      <SendQuestionnaireDialog
        personId={personId}
        patientId={patientId}
        open={activeType === "questionnaire_request"}
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
                  <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
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
                            "flex h-full flex-col items-center rounded-xl border border-border/50 bg-card p-4 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                            disabled
                              ? "cursor-not-allowed opacity-50"
                              : "hover:border-primary/30 hover:bg-primary/5",
                            tileItemClassName(type, types),
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
                          <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                            {labelText}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{descText}</p>
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
