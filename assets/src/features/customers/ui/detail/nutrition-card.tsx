import { Link } from "@tanstack/react-router";
import { Salad } from "lucide-react";
import { useState } from "react";

import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import { NutritionPlanDetailDialog } from "@/features/customers/ui/detail/nutrition-plan-detail-dialog";
import { NutritionRemoveDialog } from "@/features/customers/ui/detail/nutrition-remove-dialog";
import { TagPill } from "@/features/customers/ui/detail/tag-pill";
import { TagsCardColumn, TagsCardPillList } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import * as m from "@/paraglide/messages";
import type { AdministrativeGender } from "@/shared/types/schema-enums";

import { computeMacroPct, KCAL_PER_G } from "./nutrition-plan-utils";

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

  const macroPills = current
    ? [
        {
          key: "protein",
          label: m.nutrition_pill_protein({ value: current.proteinG }),
          pct: computeMacroPct(current.proteinG, KCAL_PER_G.protein, current.targetKcal),
        },
        {
          key: "carbs",
          label: m.nutrition_pill_carbs({ value: current.carbsG }),
          pct: computeMacroPct(current.carbsG, KCAL_PER_G.carbs, current.targetKcal),
        },
        {
          key: "fat",
          label: m.nutrition_pill_fat({ value: current.fatG }),
          pct: computeMacroPct(current.fatG, KCAL_PER_G.fat, current.targetKcal),
        },
      ]
    : [];

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
        <TagsCardColumn title={m.nutrition_list_label()} isEmpty={false} emptyText="">
          <TagsCardPillList>
            {current ? (
              <TagPill tone="violet" onClick={canInteract ? () => setEditing(true) : undefined}>
                {m.nutrition_pill_kcal({ value: current.targetKcal })}
              </TagPill>
            ) : null}
            {macroPills.map((pill) => (
              <TagPill
                key={pill.key}
                tone="muted"
                srLabel={m.nutrition_macro_energy_pct({ pct: pill.pct })}
                onClick={canInteract ? () => setEditing(true) : undefined}
              >
                {pill.label}
              </TagPill>
            ))}
          </TagsCardPillList>
          {plans.length > 0 ? (
            <Link
              to="/customers/$customerId/nutrition"
              params={{ customerId: safePersonId }}
              className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
            >
              {m.nutrition_view_all()}
            </Link>
          ) : null}
        </TagsCardColumn>
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
