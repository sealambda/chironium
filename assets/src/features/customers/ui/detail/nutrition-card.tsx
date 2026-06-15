import { Salad } from "lucide-react";
import { useState } from "react";

import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
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
    <ul className="flex flex-1 flex-col justify-center gap-2">
      {MACRO_IDS.map((id) => {
        const meta = MACRO_META[id];
        const Icon = meta.icon;
        const grams = plan[meta.fieldKey];
        const pct = computeMacroPct(grams, meta.kcalPerGram, macroTotal);
        return (
          <li key={id} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                meta.softClass,
              )}
            >
              <Icon className={cn("size-3.5", meta.iconClass)} aria-hidden />
            </span>
            <span className="text-foreground">{meta.label()}</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums">
              {grams}
              <span className="ml-0.5 font-normal text-muted-foreground text-xs">
                {m.common_unit_g()}
              </span>
            </span>
            <span className="w-8 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
              {pct}%
            </span>
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
    <div className="flex flex-col gap-3">
      <TagsCardTitle>{m.nutrition_card_title()}</TagsCardTitle>
      <div className="flex items-center gap-4">
        <NutritionDonut
          macros={gramsByMacro(current)}
          targetKcal={current.targetKcal}
          className="w-28 shrink-0"
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
        {canInteract && current ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={m.nutrition_edit_title()}
            className="-m-1 cursor-pointer rounded-lg p-1 text-left transition-colors hover:bg-accent/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {body}
          </button>
        ) : (
          body
        )}
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

          {removingId !== null ? (
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
          ) : null}
        </>
      ) : null}
    </>
  );
}
