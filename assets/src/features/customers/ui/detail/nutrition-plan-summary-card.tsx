import { Beef, Droplet, LeafIcon, Wheat } from "lucide-react";

import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import { CardFooter, CardHistoryLinkFooter } from "@/features/customers/ui/detail/card-footer";
import {
  CustomerDetailEmptyCard,
  CustomerDetailEmptyCardAddRow,
} from "@/features/customers/ui/detail/customer-detail-empty-card";
import { NutritionPlanDialog } from "@/features/customers/ui/detail/nutrition-plan-dialog";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { CardAddButton } from "@/shared/ui/card-add-button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/utils";

// ─── Props ───────────────────────────────────────────────────────────

interface NutritionPlanSummaryCardProps {
  personId: string;
  patientId: string | null;
  plan: NutritionPlanRecord | undefined;
  isLoading?: boolean;
  latestWeight?: number;
  latestHeight?: number;
  birthDate?: string;
  gender?: string;
}

// ─── Internal helpers ────────────────────────────────────────────────

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

function macroPct(grams: number, type: keyof typeof KCAL_PER_GRAM, totalKcal: number): number {
  if (totalKcal <= 0) {
    return 0;
  }
  return Math.round((grams * KCAL_PER_GRAM[type] * 100) / totalKcal);
}

// ─── Section A: Hero ─────────────────────────────────────────────────

function HeroSection({ plan }: Readonly<{ plan: NutritionPlanRecord }>) {
  return (
    <div className="min-h-19 space-y-0.5">
      {/* Primary metric */}
      <div className="flex items-baseline gap-2">
        <span className="font-bold text-3xl text-foreground tabular-nums">
          {plan.targetKcal.toLocaleString()}
        </span>
        <span className="text-foreground/65 text-sm">Kcal</span>
      </div>

      {/* Status */}
      <div className="text-foreground/65 text-xs">{m.nutrition_active_plan()}</div>
    </div>
  );
}

// ─── Section B: Macro Indicators ─────────────────────────────────────

const MACRO_CONFIG = [
  {
    key: "carbs" as const,
    icon: Wheat,
    colorClass: "text-blue-600",
    pillClass: "border-blue-200 bg-blue-100 text-blue-800",
    labelKey: m.nutrition_macro_carbs,
  },
  {
    key: "protein" as const,
    icon: Beef,
    colorClass: "text-emerald-600",
    pillClass: "border-emerald-200 bg-emerald-100 text-emerald-800",
    labelKey: m.nutrition_macro_protein,
  },
  {
    key: "fat" as const,
    icon: Droplet,
    colorClass: "text-amber-600",
    pillClass: "border-amber-200 bg-amber-100 text-amber-800",
    labelKey: m.nutrition_macro_fat,
  },
];

function MacroIndicatorsRow({
  protein,
  carbs,
  fat,
  totalKcal,
}: Readonly<{ protein: number; carbs: number; fat: number; totalKcal: number }>) {
  const values = { protein, carbs, fat };

  return (
    <div className="flex w-full flex-wrap justify-evenly gap-y-4">
      {MACRO_CONFIG.map(({ key, icon: Icon, colorClass, pillClass, labelKey }) => {
        const pct = macroPct(values[key], key, totalKcal);
        return (
          <div key={key} className="flex min-w-24 flex-col items-center gap-1">
            <div className={cn("flex items-center gap-1.5", colorClass)}>
              <Icon className="size-4" />
              <span className="font-medium text-sm">{labelKey()}</span>
            </div>
            <span className="font-bold text-3xl text-foreground tabular-nums">{pct}%</span>
            <Badge className={cn("h-5 px-1.5 font-semibold text-xs", pillClass)}>
              {values[key]}g
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

export function NutritionPlanSummaryCardSkeleton() {
  return (
    <div className="flex h-fit flex-col rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      {/* Hero: kcal, recency */}
      <div className="min-h-19 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-5 w-10" />
        </div>
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="my-4 h-px bg-border" />

      {/* Macro indicators — fills remaining space */}
      <div className="pb-4">
        <div className="flex w-full flex-wrap justify-evenly gap-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={String(i)} className="flex min-w-24 flex-col items-center gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer — pinned to bottom */}
      <CardFooter>
        <Skeleton className="h-4 w-56" />
      </CardFooter>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function NutritionPlanSummaryCard({
  personId,
  patientId,
  plan,
  isLoading,
  latestWeight,
  latestHeight,
  birthDate,
  gender,
}: Readonly<NutritionPlanSummaryCardProps>) {
  if (isLoading) {
    return <NutritionPlanSummaryCardSkeleton />;
  }

  if (!plan) {
    return (
      <CustomerDetailEmptyCard
        header={
          <CustomerDetailEmptyCardAddRow>
            <NutritionPlanDialog
              personId={personId}
              patientId={patientId}
              latestWeight={latestWeight}
              latestHeight={latestHeight}
              birthDate={birthDate}
              gender={gender}
            >
              <CardAddButton label={m.nutrition_plan_add()} />
            </NutritionPlanDialog>
          </CustomerDetailEmptyCardAddRow>
        }
        icon={LeafIcon}
        title={m.nutrition_no_plan()}
        description={m.nutrition_no_plan_desc()}
      />
    );
  }

  return (
    <div className="flex h-fit flex-col rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
      {/* Section A: Hero — kcal, recency */}
      <div className="flex items-start justify-between">
        <HeroSection plan={plan} />
        <NutritionPlanDialog
          personId={personId}
          patientId={patientId}
          latestWeight={latestWeight}
          latestHeight={latestHeight}
          birthDate={birthDate}
          gender={gender}
        >
          <CardAddButton label={m.nutrition_plan_add()} />
        </NutritionPlanDialog>
      </div>

      <div className="my-4 h-px bg-border" />

      {/* Section B: Macro Indicators */}
      <div className="pb-4">
        <MacroIndicatorsRow
          protein={plan.proteinG}
          carbs={plan.carbsG}
          fat={plan.fatG}
          totalKcal={plan.targetKcal}
        />
      </div>

      {/* Footer action — pinned to bottom */}
      <CardHistoryLinkFooter
        customerId={personId}
        to="/customers/$customerId/nutrition"
        label={m.nutrition_view_history()}
      />
    </div>
  );
}
