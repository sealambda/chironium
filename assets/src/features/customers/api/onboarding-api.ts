import { type AllergiesFormData, createAllergiesAndIntolerances } from "./allergy-intolerance-api";
import { type AnthropometryFormData, logAnthropometry } from "./anthropometry-api";
import { createGoal } from "./goals-api";
import {
  createFoodObservations,
  createMenstrualCycleObservation,
  createNoteObservations,
  type FoodFormData,
  type MenstrualCycleFormData,
  type NoteFormData,
} from "./observations-api";
import { createPatientWithPerson, type PersonFormData } from "./patients-api";
import { createSubscription, type SubscriptionFormData } from "./subscriptions-api";

// ─── Types ───────────────────────────────────────────────────────────

/** Collected form state for all onboarding steps, submitted in a single batch. */
export interface OnboardingDraft {
  person: PersonFormData | null;
  subscription: SubscriptionFormData | null;
  objective: string | null;
  menstrualCycle: MenstrualCycleFormData | null;
  anthropometry: AnthropometryFormData | null;
  allergies: AllergiesFormData | null;
  food: FoodFormData | null;
  notes: NoteFormData[] | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function hasCycleData(d: MenstrualCycleFormData): boolean {
  return Boolean(d.startDate || d.endDate || d.notes.trim());
}

function hasAnthropometryData(d: AnthropometryFormData): boolean {
  return Boolean(
    d.heightCm || d.weightKg || d.chestCm || d.waistCm || d.hipCm || d.armCm || d.thighCm,
  );
}

function hasAllergyData(d: AllergiesFormData): boolean {
  return Boolean(d.allergies.trim() || d.intolerances.trim());
}

function hasFoodData(d: FoodFormData): boolean {
  return d.included.length > 0 || d.excluded.length > 0;
}

function hasNoteData(notes: NoteFormData[]): boolean {
  return notes.some((n) => n.title.trim() || n.body.trim());
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Submit the entire onboarding draft in one shot.
 * Creates the patient first (required for IDs), then fires remaining
 * mutations concurrently.
 */
export async function submitOnboarding(
  draft: OnboardingDraft,
  organizationId: string,
  userId: string,
): Promise<void> {
  if (!draft.person) {
    throw new Error("Person data is required to complete onboarding.");
  }

  const { patientId, personId } = await createPatientWithPerson(draft.person, organizationId);

  const concurrent: Promise<void>[] = [];

  if (draft.subscription) {
    concurrent.push(createSubscription(draft.subscription, personId, organizationId));
  }
  if (draft.objective) {
    concurrent.push(createGoal(draft.objective, patientId, organizationId, userId));
  }
  if (draft.menstrualCycle && hasCycleData(draft.menstrualCycle)) {
    concurrent.push(
      createMenstrualCycleObservation(draft.menstrualCycle, patientId, organizationId, userId),
    );
  }
  if (draft.anthropometry && hasAnthropometryData(draft.anthropometry)) {
    concurrent.push(logAnthropometry(draft.anthropometry, patientId, organizationId));
  }
  if (draft.allergies && hasAllergyData(draft.allergies)) {
    concurrent.push(createAllergiesAndIntolerances(draft.allergies, patientId, organizationId));
  }
  if (draft.food && hasFoodData(draft.food)) {
    concurrent.push(createFoodObservations(draft.food, patientId, organizationId, userId));
  }
  if (draft.notes && hasNoteData(draft.notes)) {
    concurrent.push(createNoteObservations(draft.notes, patientId, organizationId, userId));
  }

  await Promise.all(concurrent);
}
