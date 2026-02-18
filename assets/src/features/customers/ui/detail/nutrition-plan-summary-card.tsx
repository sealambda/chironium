import { Beef, ChevronRight, Droplet, LeafIcon, Wheat } from "lucide-react";

import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils/utils";

// ─── Props ───────────────────────────────────────────────────────────

interface NutritionPlanSummaryCardProps {
  plan: NutritionPlanRecord | undefined;
  isLoading?: boolean;
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
    <div className="flex h-fit flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
      {/* Hero: kcal, recency */}
      <div className="min-h-19 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-5 w-10" />
        </div>
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="my-4 h-px bg-neutral-200" />

      {/* Macro indicators — fills remaining space */}
      <div className="flex flex-1 items-center pb-4">
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
      <div className="mt-auto border-neutral-200 border-t pt-3">
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function NutritionPlanSummaryCard({
  plan,
  isLoading,
}: Readonly<NutritionPlanSummaryCardProps>) {
  if (isLoading) {
    return <NutritionPlanSummaryCardSkeleton />;
  }

  if (!plan) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
        <div className="flex flex-col items-center gap-2 py-6">
          <LeafIcon className="size-8 text-neutral-400" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.nutrition_no_plan()}</p>
            <p className="text-foreground/65 text-xs">{m.nutrition_no_plan_desc()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-fit flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
      {/* Section A: Hero — kcal, recency */}
      <HeroSection plan={plan} />

      <div className="my-4 h-px bg-neutral-200" />

      {/* Section B: Macro Indicators — fills remaining space */}
      <div className="flex flex-1 items-center pb-4">
        <MacroIndicatorsRow
          protein={plan.proteinG}
          carbs={plan.carbsG}
          fat={plan.fatG}
          totalKcal={plan.targetKcal}
        />
      </div>

      {/* Footer action — pinned to bottom */}
      <div className="mt-auto border-neutral-200 border-t pt-3">
        <a
          href="#nutrition-history"
          className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
        >
          <span>{m.nutrition_view_history()}</span>
          <ChevronRight className="size-4" />
        </a>
      </div>
    </div>
  );
}
