import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Droplet,
  LayoutList,
  ListChecks,
  Pill,
  Salad,
  Scale,
  Stethoscope,
  Tablets,
  Target,
  Utensils,
} from "lucide-react";

import type { FeedEventKind } from "@/features/customers/types/activity-feed";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { cn } from "@/shared/utils/utils";

type FilterValue = FeedEventKind | "all";

interface FeedFilterChipsProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
}

interface ChipConfig {
  value: FilterValue;
  label: () => string;
  icon: LucideIcon;
  activeClass: string;
}

const CHIPS: readonly ChipConfig[] = [
  {
    value: "all",
    label: m.activity_filter_all,
    icon: LayoutList,
    activeClass: "border-primary/30 bg-primary/10 text-primary",
  },
  {
    value: "allergy",
    label: m.activity_filter_allergies,
    icon: AlertTriangle,
    activeClass: "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground",
  },
  {
    value: "anthropometry",
    label: m.activity_filter_anthropometry,
    icon: Scale,
    activeClass: "border-info/20 bg-info-muted text-info-muted-foreground",
  },
  {
    value: "condition",
    label: m.activity_filter_conditions,
    icon: Stethoscope,
    activeClass: "border-warning/20 bg-warning-muted text-warning-muted-foreground",
  },
  {
    value: "food-preference",
    label: m.activity_filter_food,
    icon: Utensils,
    activeClass: "border-success/20 bg-success-muted text-success-muted-foreground",
  },
  {
    value: "goal",
    label: m.activity_filter_goals,
    icon: Target,
    activeClass: "border-success/20 bg-success-muted text-success-muted-foreground",
  },
  {
    value: "medication",
    label: m.activity_filter_medications,
    icon: Pill,
    activeClass: "border-info/20 bg-info-muted text-info-muted-foreground",
  },
  {
    value: "prescription",
    label: m.activity_filter_prescriptions,
    icon: Tablets,
    activeClass: "border-info/20 bg-info-muted text-info-muted-foreground",
  },
  {
    value: "menstrual",
    label: m.activity_filter_menstrual,
    icon: Droplet,
    activeClass: "border-destructive/20 bg-destructive-muted text-destructive-muted-foreground",
  },
  {
    value: "nutrition",
    label: m.activity_filter_nutrition,
    icon: Salad,
    activeClass: "border-success/20 bg-success-muted text-success-muted-foreground",
  },
  {
    value: "observation",
    label: m.activity_filter_observations,
    icon: ClipboardList,
    activeClass: "border-muted-foreground/20 bg-muted text-muted-foreground",
  },
  {
    value: "questionnaire",
    label: m.activity_filter_questionnaires,
    icon: ListChecks,
    activeClass: "border-muted-foreground/20 bg-muted text-muted-foreground",
  },
  {
    value: "subscription",
    label: m.activity_filter_subscriptions,
    icon: Activity,
    activeClass: "border-info/20 bg-info-muted text-info-muted-foreground",
  },
  {
    value: "task",
    label: m.activity_filter_tasks,
    icon: CalendarClock,
    activeClass: "border-warning/20 bg-warning-muted text-warning-muted-foreground",
  },
];

const INACTIVE_BUTTON_CLASS =
  "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function FeedFilterChips({ active, onChange }: Readonly<FeedFilterChipsProps>) {
  const locale = getLocale();
  const collator = new Intl.Collator(locale);
  const chips = [...CHIPS].sort((left, right) => {
    if (left.value === "all") {
      return -1;
    }
    if (right.value === "all") {
      return 1;
    }
    return collator.compare(left.label(), right.label());
  });

  return (
    <div className="relative w-full min-w-0">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent"
        aria-hidden
      />
      <fieldset className="m-0 flex w-full min-w-0 [touch-action:pan-x] [scrollbar-width:none] flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain border-0 p-0 pe-6 [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        <legend className="sr-only">{m.activity_filter_legend()}</legend>
        {chips.map(({ value, label, icon: Icon, activeClass }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              aria-pressed={isActive}
              className={cn(
                "flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive ? activeClass : INACTIVE_BUTTON_CLASS,
              )}
            >
              <Icon className="size-3 shrink-0" aria-hidden />
              <span>{label()}</span>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
