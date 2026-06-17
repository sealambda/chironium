import { Plus, Salad } from "lucide-react";
import { useState } from "react";

import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import { NutritionPlanDetailDialog } from "@/features/customers/ui/detail/nutrition-plan-detail-dialog";
import { NutritionRemoveDialog } from "@/features/customers/ui/detail/nutrition-remove-dialog";
import { TagsCardTitle } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import * as m from "@/paraglide/messages";
import type { AdministrativeGender } from "@/shared/types/schema-enums";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

import { NutritionDonut } from "./nutrition-donut";
import { gramsByMacro, MACRO_META } from "./nutrition-macros";
import {
  computeMacroPct,
  MACRO_IDS,
  TOLERANCE_KCAL,
  totalKcalFromMacroGrams,
  unitValueFromGrams,
} from "./nutrition-plan-utils";

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

/**
 * Macro rows as a compact aligned grid: the name hugs its content and the
 * g / % / g·kg values sit in tight aligned columns (no edge-to-edge push).
 * Percentages are of the target kcal, matching the donut and the dialog.
 */
function MacroLegend({
  plan,
  weightKg,
}: Readonly<{ plan: NutritionPlanRecord; weightKg?: number | null }>) {
  return (
    <ul className="grid grid-cols-[auto_auto_auto_auto_auto] items-center gap-x-3 gap-y-2.5 text-sm">
      {MACRO_IDS.map((id) => {
        const meta = MACRO_META[id];
        const Icon = meta.icon;
        const grams = plan[meta.fieldKey];
        const pct = computeMacroPct(grams, meta.kcalPerGram, plan.targetKcal);
        const gPerKg = unitValueFromGrams({
          unit: "gkg",
          grams,
          kcalPerGram: meta.kcalPerGram,
          totalKcal: plan.targetKcal,
          weightKg: weightKg ?? undefined,
        });
        return (
          <li key={id} className="col-span-full grid grid-cols-subgrid items-center">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                meta.softClass,
              )}
            >
              <Icon className={cn("size-3.5", meta.iconClass)} aria-hidden />
            </span>
            <span className="text-foreground">{meta.label()}</span>
            <span className="text-right font-semibold text-foreground tabular-nums">
              {grams}
              <span className="ml-0.5 font-normal text-muted-foreground text-xs">
                {m.common_unit_g()}
              </span>
            </span>
            <span className="text-right text-muted-foreground tabular-nums">{pct}%</span>
            <span className="text-right text-muted-foreground text-xs tabular-nums">
              {gPerKg > 0 ? (
                <>
                  {gPerKg}
                  <span className="ml-0.5">{m.nutrition_macro_unit_g_per_kg()}</span>
                </>
              ) : (
                "—"
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Populated card: title, the centered adherence donut + off-target delta, then the macro grid. */
function NutritionCardContent({
  plan,
  weightKg,
}: Readonly<{ plan: NutritionPlanRecord; weightKg?: number | null }>) {
  const macros = gramsByMacro(plan);
  const delta = totalKcalFromMacroGrams(macros) - plan.targetKcal;
  const offTarget = Math.abs(delta) > TOLERANCE_KCAL;
  return (
    <div className="flex flex-col gap-3">
      <TagsCardTitle>{m.nutrition_card_title()}</TagsCardTitle>
      <div className="flex flex-col items-center gap-1.5">
        <NutritionDonut macros={macros} targetKcal={plan.targetKcal} className="w-32" />
        {offTarget ? (
          <p className="font-semibold text-amber-800 text-xs tabular-nums dark:text-amber-400">
            {m.nutrition_balance_off({
              delta: `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`,
            })}
          </p>
        ) : null}
      </div>
      <MacroLegend plan={plan} weightKg={weightKg} />
    </div>
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
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canInteract = Boolean(personId && organizationId);
  // Adding also needs the patient record id to attach the plan to.
  const canAdd = canInteract && Boolean(patientId);
  const safePersonId = personId ?? "";
  const safeOrgId = organizationId ?? "";
  const current = plans.at(0);

  const body = current ? <NutritionCardContent plan={current} weightKg={weightKg} /> : null;

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={!current}
        emptyIcon={Salad}
        emptyTitle={m.nutrition_empty_title()}
        emptyDescription={m.nutrition_empty_desc()}
        emptyAction={
          canAdd ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              {m.nutrition_add_title()}
            </Button>
          ) : undefined
        }
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

      {canAdd ? (
        <NutritionPlanDetailDialog
          mode="add"
          personId={safePersonId}
          patientId={patientId ?? null}
          organizationId={safeOrgId}
          weightKg={weightKg}
          heightCm={heightCm}
          dateOfBirth={dateOfBirth}
          sex={sex}
          open={adding}
          onOpenChange={(open) => {
            if (!open) {
              setAdding(false);
            }
          }}
        />
      ) : null}

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
