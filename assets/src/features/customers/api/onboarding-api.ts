import type { SubscriptionFormData } from "@/features/customers/model/subscription-form";

import { type AllergiesFormData, createAllergiesAndIntolerances } from "./allergy-intolerance-api";
import { type AnthropometryFormData, logAnthropometry } from "./anthropometry-api";
import { createConditionsFromTags, type PathologiesFormData } from "./condition-api";
import { createFoodObservations, type FoodFormData } from "./food-preferences-api";
import { createGoal } from "./goals-api";
import { createMedicationsFromTags, type MedicationsFormData } from "./medications-api";
import {
  type ClinicalNoteFormData,
  createClinicalNoteObservations,
  createMenstrualCycleObservation,
  type MenstrualCycleFormData,
} from "./observations-api";
import { createPatientWithPerson, type PersonFormData } from "./patients-api";
import { createSubscription } from "./subscriptions-api";

// ─── Types ───────────────────────────────────────────────────────────

/** Collected form state for all onboarding steps, submitted in a single batch. */
export interface OnboardingDraft {
  person: PersonFormData | null;
  subscription: SubscriptionFormData | null;
  menstrualCycle: MenstrualCycleFormData | null;
  anthropometry: AnthropometryFormData | null;
  pathologies: PathologiesFormData | null;
  allergies: AllergiesFormData | null;
  medications: MedicationsFormData | null;
  food: FoodFormData | null;
  objective: string | null;
  notes: ClinicalNoteFormData[] | null;
  pendingNote: ClinicalNoteFormData | null;
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

function hasAllergyOrIntoleranceData(d: AllergiesFormData): boolean {
  return d.allergies.length > 0 || d.intolerances.length > 0;
}

function hasMedicationsData(d: MedicationsFormData): boolean {
  return d.medications.length > 0;
}

function hasPathologiesData(d: PathologiesFormData): boolean {
  return d.pathologies.length > 0;
}

function hasFoodData(d: FoodFormData): boolean {
  return d.included.length > 0 || d.excluded.length > 0;
}

function hasNoteData(notes: ClinicalNoteFormData[]): boolean {
  return notes.some((n) => n.body.trim());
}

interface PostPatientOnboardingContext {
  draft: OnboardingDraft;
  patientId: string;
  personId: string;
  organizationId: string;
  userId: string;
  userName: string;
}

/** Side-effect mutations to run after the patient record exists. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one guarded push per optional draft slice; clearer than indirection.
function postPatientOnboardingTasks(ctx: PostPatientOnboardingContext): Promise<void>[] {
  const { draft, patientId, personId, organizationId, userId, userName } = ctx;
  const tasks: Promise<void>[] = [];

  if (draft.subscription) {
    tasks.push(createSubscription(draft.subscription, personId, organizationId));
  }

  if (draft.objective) {
    tasks.push(
      createGoal({
        description: draft.objective,
        subjectId: patientId,
        organizationId,
        userId,
        userName,
      }),
    );
  }

  if (draft.menstrualCycle && hasCycleData(draft.menstrualCycle)) {
    tasks.push(
      createMenstrualCycleObservation(
        draft.menstrualCycle,
        patientId,
        organizationId,
        userId,
        userName,
      ),
    );
  }

  if (draft.anthropometry && hasAnthropometryData(draft.anthropometry)) {
    tasks.push(logAnthropometry(draft.anthropometry, patientId, organizationId));
  }

  if (draft.pathologies && hasPathologiesData(draft.pathologies)) {
    tasks.push(createConditionsFromTags(draft.pathologies.pathologies, patientId, organizationId));
  }

  if (draft.allergies && hasAllergyOrIntoleranceData(draft.allergies)) {
    tasks.push(createAllergiesAndIntolerances(draft.allergies, patientId, organizationId));
  }

  if (draft.medications && hasMedicationsData(draft.medications)) {
    tasks.push(createMedicationsFromTags(draft.medications.medications, patientId, organizationId));
  }

  if (draft.food && hasFoodData(draft.food)) {
    tasks.push(createFoodObservations(draft.food, patientId, organizationId, userId, userName));
  }

  if (draft.notes && hasNoteData(draft.notes)) {
    tasks.push(createClinicalNoteObservations(draft.notes, patientId, organizationId));
  }

  return tasks;
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
  userName: string,
): Promise<void> {
  if (!draft.person) {
    throw new Error("Person data is required to complete onboarding.");
  }

  const { patientId, personId } = await createPatientWithPerson(draft.person, organizationId);

  await Promise.all(
    postPatientOnboardingTasks({
      draft,
      patientId,
      personId,
      organizationId,
      userId,
      userName,
    }),
  );
}
