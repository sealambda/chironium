import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Droplet,
  Pill,
  Salad,
  Scale,
  Stethoscope,
  Target,
  Utensils,
} from "lucide-react";
import { toCardinal as toCardinalEn } from "n2words/en-US";
import { toCardinal as toCardinalEs } from "n2words/es-ES";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { ConditionItem } from "@/features/customers/api/condition-api";
import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import type { GoalRecord } from "@/features/customers/api/goals-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import type {
  MenstrualCycleEntry,
  ObservationItem,
} from "@/features/customers/api/observations-api";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";

export type FeedEventAccent =
  | "blue"
  | "amber"
  | "emerald"
  | "orange"
  | "red"
  | "slate"
  | "sky"
  | "violet"
  | "yellow";

export const accentIconClass: Record<FeedEventAccent, string> = {
  blue: "text-blue-800 dark:text-blue-300",
  amber: "text-amber-700 dark:text-amber-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  orange: "text-orange-700 dark:text-orange-300",
  red: "text-red-700 dark:text-red-300",
  slate: "text-slate-700 dark:text-slate-300",
  sky: "text-sky-700 dark:text-sky-300",
  violet: "text-violet-700 dark:text-violet-300",
  yellow: "text-yellow-700 dark:text-yellow-300",
};

export const accentDotBgClass: Record<FeedEventAccent, string> = {
  blue: "bg-blue-100 dark:bg-blue-900/30",
  amber: "bg-amber-100 dark:bg-amber-900/30",
  emerald: "bg-emerald-100 dark:bg-emerald-900/30",
  orange: "bg-orange-100 dark:bg-orange-900/30",
  red: "bg-red-100 dark:bg-red-900/30",
  slate: "bg-slate-100 dark:bg-slate-800/60",
  sky: "bg-sky-100 dark:bg-sky-900/30",
  violet: "bg-violet-100 dark:bg-violet-900/30",
  yellow: "bg-yellow-100 dark:bg-yellow-900/30",
};

export interface FeedActor {
  name: string;
  id?: string;
  noteAuthorName?: string;
}

export interface VersionActorSource {
  changedBy?: { id: string; name?: string | null } | null;
  changedByPractitioner?: {
    id: string;
    name?: ReadonlyArray<{
      text?: string | null;
      given?: readonly string[] | null;
      family?: string | null;
    }> | null;
  } | null;
}

function practitionerDisplayName(
  name:
    | ReadonlyArray<{
        text?: string | null;
        given?: readonly string[] | null;
        family?: string | null;
      }>
    | null
    | undefined,
): string | undefined {
  const first = name?.[0];
  if (!first) {
    return undefined;
  }
  const text = first.text?.trim();
  if (text) {
    return text;
  }
  const given = first.given?.join(" ").trim() ?? "";
  const family = first.family?.trim() ?? "";
  const composed = [given, family].filter(Boolean).join(" ").trim();
  return composed || undefined;
}

export function actorFromVersions(
  versions: readonly VersionActorSource[] | null | undefined,
): { name: string; id?: string } | undefined {
  const version = versions?.[0];
  if (!version) {
    return undefined;
  }
  const practitioner = version.changedByPractitioner;
  const practitionerName = practitionerDisplayName(practitioner?.name);
  if (practitioner && practitionerName) {
    return { name: practitionerName, id: practitioner.id };
  }
  const user = version.changedBy;
  const userName = user?.name?.trim();
  if (user && userName) {
    return { name: userName, id: user.id };
  }
  return undefined;
}

export function actorFromNotes(
  notes: ReadonlyArray<{ authorString?: string | null }> | undefined | null,
): { name: string } | undefined {
  const name = notes?.[0]?.authorString?.trim();
  return name ? { name } : undefined;
}

export function mergeFeedActor(
  recorder: { name: string; id?: string } | undefined,
  noteAuthor: { name: string } | undefined,
): FeedActor | undefined {
  if (recorder && noteAuthor) {
    if (recorder.name === noteAuthor.name) {
      return { name: recorder.name, id: recorder.id };
    }
    return { name: recorder.name, id: recorder.id, noteAuthorName: noteAuthor.name };
  }
  if (recorder) {
    return { name: recorder.name, id: recorder.id };
  }
  if (noteAuthor) {
    return { name: noteAuthor.name };
  }
  return undefined;
}

/**
 * Collect all unique actors (by name) from a list, deduplicating based on name.
 * Returns the first occurrence of each unique name.
 */
export function uniqueActors(actors: (FeedActor | undefined)[]): FeedActor[] {
  const seen = new Set<string>();
  const result: FeedActor[] = [];
  for (const actor of actors) {
    if (actor && !seen.has(actor.name)) {
      seen.add(actor.name);
      result.push(actor);
    }
  }
  return result;
}

export type FeedEvent =
  | {
      kind: "observation";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: ObservationItem;
    }
  | { kind: "task"; id: string; date: string; actors?: FeedActor[]; payload: PatientTask }
  | {
      kind: "goal";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: GoalRecord[];
    }
  | {
      kind: "subscription";
      id: string;
      date: string;
      actors?: FeedActor[];
      variant: "started" | "finished" | "paused" | "resumed" | "cancelled";
      payload: SubscriptionRecord;
      pause?: { id: string; startDate: string; endDate?: string | null; reason?: string | null };
    }
  | {
      kind: "anthropometry";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: AnthropometricSnapshot;
    }
  | { kind: "condition"; id: string; date: string; actors?: FeedActor[]; payload: ConditionItem[] }
  | {
      kind: "allergy";
      id: string;
      date: string;
      actors?: FeedActor[];
      aiType: "ALLERGY" | "INTOLERANCE";
      payload: AllergyIntoleranceItem[];
    }
  | {
      kind: "medication";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: MedicationItem[];
    }
  | {
      kind: "menstrual";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: MenstrualCycleEntry;
    }
  | {
      kind: "food-preference";
      id: string;
      date: string;
      actors?: FeedActor[];
      variant: "inclusion" | "exclusion";
      payload: FoodPreferenceHistoryItem[];
    }
  | {
      kind: "nutrition";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: NutritionPlanRecord[];
    };

export type FeedEventKind = FeedEvent["kind"];

export interface FeedDateGroup {
  label: string;
  isoDate: string;
  events: FeedEvent[];
  isToday: boolean;
  isFuture: boolean;
}

export type SubscriptionVariant = Extract<FeedEvent, { kind: "subscription" }>["variant"];

const SUBSCRIPTION_ACCENT: Record<SubscriptionVariant, FeedEventAccent> = {
  started: "blue",
  finished: "red",
  cancelled: "red",
  paused: "amber",
  resumed: "emerald",
};

const SUBSCRIPTION_VERB: Record<SubscriptionVariant, () => string> = {
  started: m.activity_verb_subscription_started,
  finished: m.activity_verb_subscription_finished,
  paused: m.activity_verb_subscription_paused,
  resumed: m.activity_verb_subscription_resumed,
  cancelled: m.activity_verb_subscription_cancelled,
};

export function getEventAccent(event: FeedEvent): FeedEventAccent {
  switch (event.kind) {
    case "observation":
      return "slate";
    case "task":
      return "amber";
    case "goal":
      return "sky";
    case "subscription":
      return SUBSCRIPTION_ACCENT[event.variant];
    case "anthropometry":
      return "sky";
    case "condition":
      return "blue";
    case "allergy":
      return event.aiType === "ALLERGY" ? "red" : "orange";
    case "medication":
      return "violet";
    case "menstrual":
      return "red";
    case "food-preference":
      return event.variant === "inclusion" ? "emerald" : "yellow";
    case "nutrition":
      return "emerald";
  }
}

export function getEventIcon(event: FeedEvent): LucideIcon {
  switch (event.kind) {
    case "observation":
      return ClipboardList;
    case "task":
      return CalendarClock;
    case "goal":
      return Target;
    case "subscription":
      return Activity;
    case "anthropometry":
      return Scale;
    case "condition":
      return Stethoscope;
    case "allergy":
      return AlertTriangle;
    case "medication":
      return Pill;
    case "menstrual":
      return Droplet;
    case "food-preference":
      return Utensils;
    case "nutrition":
      return Salad;
  }
}

export function getEventLabel(event: FeedEvent): string {
  switch (event.kind) {
    case "observation":
      return m.activity_event_note();
    case "task":
      return m.activity_event_reminder();
    case "goal":
      return m.activity_event_goal_created();
    case "subscription":
      return m.activity_event_subscription();
    case "anthropometry":
      return m.activity_event_anthropometry();
    case "condition":
      return m.activity_event_condition();
    case "allergy":
      return event.aiType === "ALLERGY"
        ? m.activity_event_allergy()
        : m.activity_event_intolerance();
    case "medication":
      return m.activity_event_medication();
    case "menstrual":
      return m.activity_event_menstrual();
    case "food-preference":
      return event.variant === "inclusion"
        ? m.activity_event_food_inclusion()
        : m.activity_event_food_exclusion();
    case "nutrition":
      return m.activity_event_nutrition();
  }
}

export function getEventCount(event: FeedEvent): number {
  switch (event.kind) {
    case "goal":
      return event.payload.length;
    case "condition":
    case "allergy":
    case "medication":
      return event.payload.length;
    case "food-preference":
      return event.payload.length;
    case "nutrition":
      return event.payload.length;
    default:
      return 1;
  }
}

function countWord(n: number): string {
  const toCardinal = getLocale() === "es" ? toCardinalEs : toCardinalEn;
  return toCardinal(n);
}

function verbForGoal(count: number, word: string): string {
  return count > 1
    ? m.activity_verb_goal_created_plural({ count: word })
    : m.activity_verb_goal_created();
}

function verbForFoodPreference(
  event: Extract<FeedEvent, { kind: "food-preference" }>,
  count: number,
  word: string,
): string {
  if (event.variant === "inclusion") {
    return count > 1
      ? m.activity_verb_food_inclusion_plural({ count: word })
      : m.activity_verb_food_inclusion();
  }
  return count > 1
    ? m.activity_verb_food_exclusion_plural({ count: word })
    : m.activity_verb_food_exclusion();
}

export function getEventVerb(event: FeedEvent, count = 1): string {
  const word = count > 1 ? countWord(count) : "";
  switch (event.kind) {
    case "observation":
      return m.activity_verb_note();
    case "task":
      return m.activity_verb_reminder();
    case "goal":
      return verbForGoal(count, word);
    case "subscription":
      return SUBSCRIPTION_VERB[event.variant]();
    case "anthropometry":
      return m.activity_verb_anthropometry();
    case "condition":
      return count > 1
        ? m.activity_verb_condition_plural({ count: word })
        : m.activity_verb_condition();
    case "allergy":
      return count > 1
        ? m.activity_verb_allergy_plural({ count: word })
        : m.activity_verb_allergy();
    case "medication":
      return count > 1
        ? m.activity_verb_medication_plural({ count: word })
        : m.activity_verb_medication();
    case "menstrual":
      return m.activity_verb_menstrual();
    case "food-preference":
      return verbForFoodPreference(event, count, word);
    case "nutrition":
      return count > 1
        ? m.activity_verb_nutrition_plural({ count: word })
        : m.activity_verb_nutrition();
  }
}
