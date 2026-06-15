import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import { MACRO_META } from "@/features/customers/ui/detail/nutrition-macros";
import { MACRO_IDS } from "@/features/customers/ui/detail/nutrition-plan-utils";
import * as m from "@/paraglide/messages";
import { cn } from "@/shared/utils/utils";

interface NutritionEventProps {
  plans: NutritionPlanRecord[];
}

/** Timeline body for a nutrition-plan event: target kcal + the macro split. */
export function NutritionEvent({ plans }: Readonly<NutritionEventProps>) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {plans.map((plan) => (
        <div key={plan.id} className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border bg-card px-3 py-1.5 font-semibold text-foreground text-sm tabular-nums">
            {plan.targetKcal.toLocaleString()} {m.common_unit_kcal()}
          </span>
          {MACRO_IDS.map((id) => {
            const meta = MACRO_META[id];
            const Icon = meta.icon;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-foreground text-sm tabular-nums"
              >
                <Icon className={cn("size-3.5 shrink-0", meta.iconClass)} aria-hidden />
                {plan[meta.fieldKey]} {m.common_unit_g()}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
