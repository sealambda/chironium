import { Salad } from "lucide-react";
import { useState } from "react";

import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import { DetailEditButton } from "@/features/customers/ui/detail/detail-edit-button";
import { NutritionPlanDetailDialog } from "@/features/customers/ui/detail/nutrition-plan-detail-dialog";
import { NutritionRemoveDialog } from "@/features/customers/ui/detail/nutrition-remove-dialog";
import { TagsCardTitle } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import * as m from "@/paraglide/messages";
import type { AdministrativeGender } from "@/shared/types/schema-enums";
import { cn } from "@/shared/utils/utils";

import { NutritionDonut } from "./nutrition-donut";
import { gramsByMacro, MACRO_META } from "./nutrition-macros";
import { computeMacroPct, MACRO_IDS, totalKcalFromMacroGrams } from "./nutrition-plan-utils";

interface NutritionCardProps {
  /** Plans sorted newest-first; index 0 is the current plan. */
  readonly plans: NutritionPlanRecord[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly patientId?: string | null;
  readonly organizationId?: string;
  readonly weightKg?: number | null;
  readonly heightCm?: number | null;
  readonly dateOfBirth?: string | null;
  readonly sex?: AdministrativeGender | null;
}

function MacroLegend({ plan }: Readonly<{ plan: NutritionPlanRecord }>) {
  const macroTotal = totalKcalFromMacroGrams(gramsByMacro(plan));
  return (
    <ul className="grid w-fit grid-cols-[auto_max-content_auto_auto] gap-x-2 gap-y-2 lg:w-full lg:min-w-0 lg:flex-1 lg:grid-cols-[auto_1fr_auto_auto] @max-[22rem]/nutrition:grid-cols-[auto_auto_auto]">
      {MACRO_IDS.map((id) => {
        const meta = MACRO_META[id];
        const Icon = meta.icon;
        const grams = plan[meta.fieldKey];
        const pct = computeMacroPct(grams, meta.kcalPerGram, macroTotal);
        return (
          <li key={id} className="col-span-full grid grid-cols-subgrid items-center gap-x-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                meta.softClass,
              )}
            >
              <Icon className={cn("size-3.5", meta.iconClass)} aria-hidden />
            </span>
            <span className="truncate pr-5 text-sm text-foreground @max-[22rem]/nutrition:sr-only">
              {meta.label()}
            </span>
            <span className="text-right text-sm font-semibold text-foreground tabular-nums">
              {grams}
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                {m.common_unit_g()}
              </span>
            </span>
            <span className="text-right text-xs text-muted-foreground tabular-nums">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

export function NutritionCard({
  plans,
  isLoading,
  compact,
  personId,
  patientId,
  organizationId,
  weightKg,
  heightCm,
  dateOfBirth,
  sex,
}: Readonly<NutritionCardProps>) {
  const [editing, setEditing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canInteract = Boolean(personId && organizationId);
  const safePersonId = personId ?? "";
  const safeOrgId = organizationId ?? "";
  const current = plans.at(0);

  const body = current ? (
    <div className="@container/nutrition flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TagsCardTitle>{m.nutrition_card_title()}</TagsCardTitle>
        {canInteract ? (
          <DetailEditButton ariaLabel={m.nutrition_edit_title()} onClick={() => setEditing(true)} />
        ) : null}
      </div>
      <div className="flex items-center justify-center gap-4 lg:justify-start lg:gap-3">
        <NutritionDonut
          macros={gramsByMacro(current)}
          targetKcal={current.targetKcal}
          className="w-32 shrink-0"
        />
        <MacroLegend plan={current} />
      </div>
    </div>
  ) : null;

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={!current}
        emptyIcon={Salad}
        emptyTitle={m.nutrition_empty_title()}
        emptyDescription={m.nutrition_empty_desc()}
        compact={compact}
      >
        {body}
      </TagsCardShell>

      {canInteract && current ? (
        <>
          <NutritionPlanDetailDialog
            mode="edit"
            item={current}
            personId={safePersonId}
            patientId={patientId ?? null}
            organizationId={safeOrgId}
            weightKg={weightKg}
            heightCm={heightCm}
            dateOfBirth={dateOfBirth}
            sex={sex}
            open={editing}
            onOpenChange={(open) => {
              if (!open) {
                setEditing(false);
              }
            }}
            onRemoveClick={() => {
              setRemovingId(current.id);
              setEditing(false);
            }}
          />

          {removingId === null ? null : (
            <NutritionRemoveDialog
              id={removingId}
              personId={safePersonId}
              organizationId={safeOrgId}
              open={removingId !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setRemovingId(null);
                }
              }}
            />
          )}
        </>
      ) : null}
    </>
  );
}
