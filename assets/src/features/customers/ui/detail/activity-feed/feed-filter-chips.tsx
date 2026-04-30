import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Droplet,
  LayoutList,
  Pill,
  Scale,
  Star,
  Stethoscope,
  Utensils,
} from "lucide-react";

import type { FeedEventKind } from "@/features/customers/types/activity-feed";
import * as m from "@/paraglide/messages";
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
  /** Classes applied to the button when this chip is active. */
  activeClass: string;
  /** Icon color when active (inactive uses text-muted-foreground). */
  activeIconClass: string;
}

const CHIPS: readonly ChipConfig[] = [
  {
    value: "all",
    label: m.activity_filter_all,
    icon: LayoutList,
    activeClass: "border-primary/30 bg-primary/10 text-primary",
    activeIconClass: "text-primary",
  },
  {
    value: "observation",
    label: m.activity_filter_observations,
    icon: ClipboardList,
    activeClass:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    activeIconClass: "text-slate-500",
  },
  {
    value: "task",
    label: m.activity_filter_tasks,
    icon: CalendarClock,
    activeClass:
      "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    activeIconClass: "text-amber-500",
  },
  {
    value: "goal",
    label: m.activity_filter_goals,
    icon: Star,
    activeClass:
      "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    activeIconClass: "text-sky-500",
  },
  {
    value: "subscription",
    label: m.activity_filter_subscriptions,
    icon: Activity,
    activeClass:
      "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    activeIconClass: "text-blue-500",
  },
  {
    value: "anthropometry",
    label: m.activity_filter_anthropometry,
    icon: Scale,
    activeClass:
      "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    activeIconClass: "text-sky-500",
  },
  {
    value: "condition",
    label: m.activity_filter_conditions,
    icon: Stethoscope,
    activeClass:
      "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    activeIconClass: "text-blue-500",
  },
  {
    value: "allergy",
    label: m.activity_filter_allergies,
    icon: AlertTriangle,
    activeClass:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300",
    activeIconClass: "text-red-500",
  },
  {
    value: "medication",
    label: m.activity_filter_medications,
    icon: Pill,
    activeClass:
      "border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    activeIconClass: "text-violet-500",
  },
  {
    value: "menstrual",
    label: m.activity_filter_menstrual,
    icon: Droplet,
    activeClass:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300",
    activeIconClass: "text-red-500",
  },
  {
    value: "food-preference",
    label: m.activity_filter_food,
    icon: Utensils,
    activeClass:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    activeIconClass: "text-emerald-500",
  },
];

const INACTIVE_BUTTON_CLASS =
  "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function FeedFilterChips({ active, onChange }: Readonly<FeedFilterChipsProps>) {
  return (
    <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">Filter activity</legend>
      {CHIPS.map(({ value, label, icon: Icon, activeClass, activeIconClass }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            className={cn(
              "flex items-center justify-center gap-1 rounded-full border px-3 py-1 font-medium text-xs transition-colors",
              isActive ? activeClass : INACTIVE_BUTTON_CLASS,
            )}
          >
            <Icon
              className={cn(
                "size-3 shrink-0",
                isActive ? activeIconClass : "text-muted-foreground",
              )}
            />
            <span className="truncate">{label()}</span>
          </button>
        );
      })}
    </fieldset>
  );
}
