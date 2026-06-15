import * as m from "@/paraglide/messages";
import { cn } from "@/shared/utils/utils";

import { MACRO_META } from "./nutrition-macros";
import {
  computeMacroPct,
  type MacroGrams,
  type MacroId,
  macroArcSegments,
  totalKcalFromMacroGrams,
} from "./nutrition-plan-utils";

// Radius chosen so the circle circumference is exactly 100 — each macro's
// percentage maps 1:1 to its stroke-dash length.
const RADIUS = 15.91549431;
const STROKE_WIDTH = 4.5;
// Small gap (in circumference-100 units) between adjacent macro arcs.
const SEGMENT_GAP = 2;

interface NutritionDonutProps {
  readonly macros: MacroGrams;
  readonly targetKcal: number;
  readonly className?: string;
}

/**
 * Ring chart of the macro energy split with the target kcal in the centre.
 * Hand-rolled SVG (no chart dependency); arc geometry comes from the tested
 * `macroArcSegments` helper. Exposed to assistive tech as a single labelled image.
 */
export function NutritionDonut({ macros, targetKcal, className }: Readonly<NutritionDonutProps>) {
  const segments = macroArcSegments(macros);
  const macroTotal = totalKcalFromMacroGrams(macros);
  const pct = (id: MacroId) => computeMacroPct(macros[id], MACRO_META[id].kcalPerGram, macroTotal);

  return (
    <div
      className={cn("relative aspect-square", className)}
      role="img"
      aria-label={m.nutrition_donut_aria({
        kcal: targetKcal.toLocaleString(),
        protein: pct("protein"),
        carbs: pct("carbs"),
        fat: pct("fat"),
      })}
    >
      <svg viewBox="0 0 42 42" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="21"
          cy="21"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          className="stroke-muted"
        />
        {segments.map((segment) => {
          const length = segment.fraction * 100;
          const visible = Math.max(length - SEGMENT_GAP, 0.5);
          return (
            <circle
              key={segment.id}
              cx="21"
              cy="21"
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE_WIDTH}
              className={MACRO_META[segment.id].arcClass}
              strokeDasharray={`${visible} ${100 - visible}`}
              strokeDashoffset={`${-(segment.offset * 100) - SEGMENT_GAP / 2}`}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-2xl text-foreground tabular-nums leading-none">
          {targetKcal.toLocaleString()}
        </span>
        <span className="mt-0.5 text-muted-foreground text-xs">{m.common_unit_kcal()}</span>
      </div>
    </div>
  );
}
