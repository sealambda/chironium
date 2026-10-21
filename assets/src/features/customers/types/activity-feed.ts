import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Droplet,
  ListChecks,
  Pill,
  Salad,
  Scale,
  Send,
  Stethoscope,
  Tablets,
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
import type { MedicationRequestItem } from "@/features/customers/api/medication-requests-api";
import type { MedicationItem } from "@/features/customers/api/medications-api";
import type { NutritionPlanRecord } from "@/features/customers/api/nutrition-plans-api";
import type {
  MenstrualCycleEntry,
  ObservationItem,
} from "@/features/customers/api/observations-api";
import type { FeedEventAccent } from "@/features/customers/types/activity-feed-accents";
import type { FeedActor } from "@/features/customers/types/feed-actor";
import type { QuestionnaireResponseRecord } from "@/features/questionnaires/api/questionnaire-responses-api";
import type { QuestionnaireRequestStatus } from "@/features/questionnaires/model/questionnaire-request-status";
import type { PatientTask } from "@/features/tasks/api/tasks-api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";

export type FeedEvent =
  | {
      kind: "observation";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: ObservationItem;
    }
  | {
      kind: "task";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: PatientTask;
    }
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
      pause?: {
        id: string;
        startDate: string;
        endDate?: string | null;
        reason?: string | null;
      };
    }
  | {
      kind: "anthropometry";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: AnthropometricSnapshot;
    }
  | {
      kind: "condition";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: ConditionItem[];
    }
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
      kind: "prescription";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: MedicationRequestItem[];
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
    }
  | {
      kind: "questionnaire";
      id: string;
      date: string;
      actors?: FeedActor[];
      payload: QuestionnaireResponseRecord;
    }
  | {
      kind: "questionnaire-request";
      id: string;
      date: string;
      actors?: FeedActor[];
      status: QuestionnaireRequestStatus;
      payload: PatientTask;
    };

export type FeedEventKind = FeedEvent["kind"];

/** A feed filter: one event kind, or every event. */
export type FeedFilter = FeedEventKind | "all";

/** Kinds shown under another kind's filter chip rather than their own. */
const FILTER_KIND: Partial<Record<FeedEventKind, FeedEventKind>> = {
  "questionnaire-request": "questionnaire",
};

export function matchesFeedFilter(kind: FeedEventKind, filter: FeedFilter): boolean {
  return filter === "all" || (FILTER_KIND[kind] ?? kind) === filter;
}

/** Whether the patient reported the event's values themselves, through a questionnaire. */
export function isSelfReportedEvent(event: FeedEvent): boolean {
  switch (event.kind) {
    case "observation":
    case "questionnaire":
    case "menstrual":
      return event.payload.selfReported === true;
    case "anthropometry":
      return Object.values(event.payload.observations ?? {}).some((ref) => ref?.selfReported);
    case "food-preference":
      return event.payload.some((item) => item.selfReported);
    default:
      return false;
  }
}

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
      return "blue";
    case "prescription":
      return "violet";
    case "menstrual":
      return "red";
    case "food-preference":
      return event.variant === "inclusion" ? "emerald" : "yellow";
    case "nutrition":
      return "emerald";
    case "questionnaire":
      return "slate";
    case "questionnaire-request":
      return "violet";
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
    case "prescription":
      return Tablets;
    case "menstrual":
      return Droplet;
    case "food-preference":
      return Utensils;
    case "nutrition":
      return Salad;
    case "questionnaire":
      return ListChecks;
    case "questionnaire-request":
      return Send;
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
    case "prescription":
      return m.activity_event_prescription();
    case "menstrual":
      return m.activity_event_menstrual();
    case "food-preference":
      return event.variant === "inclusion"
        ? m.activity_event_food_inclusion()
        : m.activity_event_food_exclusion();
    case "nutrition":
      return m.activity_event_nutrition();
    case "questionnaire":
    case "questionnaire-request":
      return m.activity_event_questionnaire();
  }
}

export function getEventCount(event: FeedEvent): number {
  switch (event.kind) {
    case "goal":
      return event.payload.length;
    case "condition":
    case "allergy":
    case "medication":
    case "prescription":
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
    case "prescription":
      return count > 1
        ? m.activity_verb_prescription_plural({ count: word })
        : m.activity_verb_prescription();
    case "menstrual":
      return m.activity_verb_menstrual();
    case "food-preference":
      return verbForFoodPreference(event, count, word);
    case "nutrition":
      return count > 1
        ? m.activity_verb_nutrition_plural({ count: word })
        : m.activity_verb_nutrition();
    case "questionnaire":
      return m.activity_verb_questionnaire();
    case "questionnaire-request":
      return m.activity_verb_questionnaire_request();
  }
}
