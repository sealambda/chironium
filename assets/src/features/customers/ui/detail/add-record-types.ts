import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  Pill,
  RefreshCcwDot,
  Salad,
  Scale,
  Send,
  ShieldAlert,
  Stethoscope,
  Tablets,
  Target,
  Utensils,
} from "lucide-react";

import * as m from "@/paraglide/messages";

export type RecordType =
  | "measurement"
  | "goal"
  | "note"
  | "reminder"
  | "condition"
  | "medication"
  | "prescription"
  | "allergy"
  | "menstrual_cycle"
  | "food_preferences"
  | "nutrition"
  | "questionnaire"
  | "questionnaire_request"
  | "subscription";

/** Paraglide message functions return the resolved string for the active locale. */
type Message = () => string;

interface RecordTypeConfig {
  readonly id: RecordType;
  readonly icon: LucideIcon;
  readonly bgClassName: string;
  readonly iconClassName: string;
  readonly label: Message;
  readonly desc: Message;
  readonly priority?: "primary";
  readonly disabled?: boolean;
}

interface RecordTypeGroup {
  readonly groupLabel: Message;
  readonly types: readonly RecordTypeConfig[];
}

export const RECORD_TYPE_GROUPS: readonly RecordTypeGroup[] = [
  {
    groupLabel: m.add_record_group_tracking,
    types: [
      {
        id: "note",
        icon: FileText,
        bgClassName: "bg-muted",
        iconClassName: "text-muted-foreground",
        label: m.add_record_tile_note,
        desc: m.add_record_note_desc,
        priority: "primary",
      },
      {
        id: "measurement",
        icon: Scale,
        bgClassName: "bg-muted",
        iconClassName: "text-muted-foreground",
        label: m.add_record_tile_measurement,
        desc: m.add_record_measurement_desc,
        priority: "primary",
      },
      {
        id: "questionnaire",
        icon: ClipboardList,
        bgClassName: "bg-muted",
        iconClassName: "text-muted-foreground",
        label: m.add_record_tile_questionnaire,
        desc: m.add_record_questionnaire_desc,
      },
      {
        id: "questionnaire_request",
        icon: Send,
        bgClassName: "bg-muted",
        iconClassName: "text-muted-foreground",
        label: m.add_record_tile_questionnaire_request,
        desc: m.add_record_questionnaire_request_desc,
      },
      {
        id: "reminder",
        icon: CalendarClock,
        bgClassName: "bg-warning-muted",
        iconClassName: "text-warning-muted-foreground",
        label: m.add_record_tile_reminder,
        desc: m.add_record_reminder_desc,
      },
      {
        id: "goal",
        icon: Target,
        bgClassName: "bg-info-muted",
        iconClassName: "text-info-muted-foreground",
        label: m.add_record_tile_goal,
        desc: m.add_record_goal_desc,
      },
      {
        id: "subscription",
        icon: CreditCard,
        bgClassName: "bg-primary/10",
        iconClassName: "text-primary",
        label: m.add_record_tile_subscription,
        desc: m.add_record_subscription_desc,
      },
    ],
  },
  {
    groupLabel: m.add_record_group_health,
    types: [
      {
        id: "condition",
        icon: Stethoscope,
        bgClassName: "bg-destructive-muted",
        iconClassName: "text-destructive-muted-foreground",
        label: m.add_record_tile_condition,
        desc: m.add_record_condition_desc,
      },
      {
        id: "medication",
        icon: Pill,
        bgClassName: "bg-info-muted",
        iconClassName: "text-info-muted-foreground",
        label: m.add_record_tile_medication,
        desc: m.add_record_medication_desc,
      },
      {
        id: "prescription",
        icon: Tablets,
        bgClassName: "bg-info-muted",
        iconClassName: "text-info-muted-foreground",
        label: m.add_record_tile_prescription,
        desc: m.add_record_prescription_desc,
      },
      {
        id: "allergy",
        icon: ShieldAlert,
        bgClassName: "bg-warning-muted",
        iconClassName: "text-warning-muted-foreground",
        label: m.add_record_tile_allergy,
        desc: m.add_record_allergy_desc,
      },
      {
        id: "menstrual_cycle",
        icon: RefreshCcwDot,
        bgClassName: "bg-primary/10",
        iconClassName: "text-primary",
        label: m.add_record_tile_menstrual_cycle,
        desc: m.add_record_menstrual_cycle_desc,
      },
    ],
  },
  {
    groupLabel: m.add_record_group_nutrition,
    types: [
      {
        id: "food_preferences",
        icon: Utensils,
        bgClassName: "bg-success-muted",
        iconClassName: "text-success-muted-foreground",
        label: m.add_record_tile_food_pref,
        desc: m.add_record_food_pref_desc,
      },
      {
        id: "nutrition",
        icon: Salad,
        bgClassName: "bg-success-muted",
        iconClassName: "text-success-muted-foreground",
        label: m.add_record_tile_nutrition,
        desc: m.add_record_nutrition_desc,
      },
    ],
  },
];

export function tileGridClassName(count: number): string {
  if (count >= 5) {
    // 6-col ghost grid: primary tiles take halves, the rest thirds, and a short
    // last row stretches to fill (see `tileItemClassName`).
    return "grid grid-cols-6 gap-3";
  }
  if (count === 4) {
    return "grid grid-cols-2 gap-3 sm:grid-cols-4";
  }
  if (count === 3) {
    return "grid grid-cols-2 gap-3 sm:grid-cols-3";
  }
  if (count === 1) {
    return "flex justify-center";
  }
  return "grid grid-cols-2 gap-3";
}

export function tileItemClassName(
  type: RecordTypeConfig,
  types: readonly RecordTypeConfig[],
): string {
  const total = types.length;
  if (total >= 5) {
    if (type.priority === "primary") {
      return "col-span-3";
    }
    // Secondary tiles fill rows of three; a shorter last row stretches to the full width.
    const secondary = types.filter((t) => t.priority !== "primary");
    const lastRowSize = secondary.length % 3;
    const inLastRow = lastRowSize > 0 && secondary.indexOf(type) >= secondary.length - lastRowSize;
    if (!inLastRow) {
      return "col-span-2";
    }
    return lastRowSize === 2 ? "col-span-3" : "col-span-6";
  }
  if (total === 1) {
    return "w-full sm:w-1/2";
  }
  return "";
}
