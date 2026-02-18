import type { ResultOf } from "@graphql-typed-document-node/core";

import { graphql } from "@/gql";
import type { AdministrativeGender } from "@/gql/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

const CreatePatientWithPersonMutation = graphql(`
  mutation CreatePatientWithPerson($input: CreatePatientWithPersonInput) {
    createPatientWithPerson(input: $input) {
      result {
        id
        personId
      }
      errors {
        message
      }
    }
  }
`);

const CreateSubscriptionMutation = graphql(`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      result {
        id
        state
        startDate
      }
      errors {
        message
      }
    }
  }
`);

const CreateObservationMutation = graphql(`
  mutation CreateObservation($input: CreateObservationInput!) {
    createObservation(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogBodyHeightMutation = graphql(`
  mutation LogBodyHeight($input: LogBodyHeightInput!) {
    logBodyHeight(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const LogBodyWeightMutation = graphql(`
  mutation LogBodyWeight($input: LogBodyWeightInput!) {
    logBodyWeight(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

const CreateAllergyIntoleranceMutation = graphql(`
  mutation CreateAllergyIntolerance($input: CreateAllergyIntoleranceInput!) {
    createAllergyIntolerance(input: $input) {
      result {
        id
        type
      }
      errors {
        message
      }
    }
  }
`);

const ListSubscriptionPlansQuery = graphql(`
  query ListSubscriptionPlans($first: Int) {
    listSubscriptionPlans(first: $first) {
      results {
        id
        name
        duration {
          value
          code
        }
        priceAmount {
          amount
          currency
        }
      }
    }
  }
`);

export interface PersonFormData {
  givenName: string;
  familyName: string;
  birthDate?: string;
  gender?: AdministrativeGender;
  phone?: string;
  email?: string;
  instagram?: string;
}

export interface CreatePatientResult {
  patientId: string;
  personId: string;
}

/**
 * Create a patient with an associated person record.
 */
export async function createPatientWithPerson(
  data: PersonFormData,
  organizationId: string,
): Promise<CreatePatientResult> {
  const telecom: Array<{ system: string; value: string }> = [];
  if (data.phone) {
    telecom.push({ system: "PHONE", value: data.phone });
  }
  if (data.email) {
    telecom.push({ system: "EMAIL", value: data.email });
  }
  if (data.instagram) {
    telecom.push({ system: "URL", value: data.instagram });
  }

  const result = await requestGraphql({
    document: CreatePatientWithPersonMutation,
    variables: {
      input: {
        person: {
          name: [{ given: [data.givenName], family: data.familyName }],
          birthDate: data.birthDate || undefined,
          gender: data.gender || undefined,
          telecom: telecom.length > 0 ? telecom : undefined,
        },
      },
    },
    organizationId,
  });

  const patient = unwrapMutationResult(result.createPatientWithPerson, "Failed to create patient.");

  return { patientId: patient.id, personId: patient.personId ?? "" };
}

export interface SubscriptionFormData {
  planId: string;
  startDate?: string;
}

/**
 * Create a subscription for a person.
 */
export async function createSubscription(
  data: SubscriptionFormData,
  subscriberId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateSubscriptionMutation,
    variables: {
      input: {
        subscriberId,
        planId: data.planId,
        startDate: data.startDate || undefined,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createSubscription, "Failed to create subscription.");
}

/**
 * Create an objective observation (code 703039001) for a patient.
 */
export async function createObjective(
  note: string,
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateObservationMutation,
    variables: {
      input: {
        status: "FINAL",
        code: { coding: [{ system: "http://snomed.info/sct", code: "703039001" }] },
        valueString: note,
        note: [{ text: note, authorString: "System", time: new Date().toISOString() }],
        subjectId,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createObservation, "Failed to create objective.");
}

export type SubscriptionPlan = NonNullable<
  NonNullable<ResultOf<typeof ListSubscriptionPlansQuery>["listSubscriptionPlans"]>["results"]
>[number];

/**
 * Fetch available subscription plans.
 */
export async function fetchSubscriptionPlans(organizationId: string): Promise<SubscriptionPlan[]> {
  const data = await requestGraphql({
    document: ListSubscriptionPlansQuery,
    variables: { first: 50 },
    organizationId,
  });

  return data.listSubscriptionPlans?.results ?? [];
}

// ---------------------------------------------------------------------------
// Onboarding steps 4-8
// ---------------------------------------------------------------------------

export interface MenstrualCycleFormData {
  startDate: string;
  endDate: string;
  notes: string;
}

/**
 * Create a menstrual-cycle observation (SNOMED 364307006) combining dates and notes.
 */
export async function createMenstrualCycleObservation(
  data: MenstrualCycleFormData,
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const parts: string[] = [];
  if (data.startDate) {
    parts.push(`Start: ${data.startDate}`);
  }
  if (data.endDate) {
    parts.push(`End: ${data.endDate}`);
  }
  if (data.notes.trim()) {
    parts.push(data.notes.trim());
  }
  const noteText = parts.join(" | ");

  const result = await requestGraphql({
    document: CreateObservationMutation,
    variables: {
      input: {
        status: "FINAL",
        code: { coding: [{ system: "http://snomed.info/sct", code: "364307006" }] },
        valueString: noteText,
        note: [{ text: noteText, authorString: "System", time: new Date().toISOString() }],
        subjectId,
      },
    },
    organizationId,
  });

  unwrapMutationResult(result.createObservation, "Failed to create menstrual cycle observation.");
}

export interface BodyMeasurementsFormData {
  heightCm: number | null;
  weightKg: number | null;
}

/**
 * Log body height and/or weight. Skips whichever value is absent.
 */
export async function logBodyMeasurements(
  data: BodyMeasurementsFormData,
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (data.heightCm && data.heightCm > 0) {
    const heightCm = data.heightCm;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogBodyHeightMutation,
          variables: { input: { subjectId, heightCm } },
          organizationId,
        });
        unwrapMutationResult(result.logBodyHeight, "Failed to log body height.");
      })(),
    );
  }

  if (data.weightKg && data.weightKg > 0) {
    const weightKg = data.weightKg;
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: LogBodyWeightMutation,
          variables: { input: { subjectId, weightKg } },
          organizationId,
        });
        unwrapMutationResult(result.logBodyWeight, "Failed to log body weight.");
      })(),
    );
  }

  await Promise.all(promises);
}

export interface AllergiesFormData {
  allergies: string;
  intolerances: string;
}

/**
 * Create allergy and/or intolerance records. Skips empty values.
 */
export async function createAllergiesAndIntolerances(
  data: AllergiesFormData,
  patientId: string,
  organizationId: string,
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (data.allergies.trim()) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: CreateAllergyIntoleranceMutation,
          variables: {
            input: {
              type: "ALLERGY",
              clinicalStatus: "ACTIVE",
              verificationStatus: "CONFIRMED",
              code: { text: data.allergies.trim() },
              patientId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(result.createAllergyIntolerance, "Failed to create allergy record.");
      })(),
    );
  }

  if (data.intolerances.trim()) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: CreateAllergyIntoleranceMutation,
          variables: {
            input: {
              type: "INTOLERANCE",
              clinicalStatus: "ACTIVE",
              verificationStatus: "CONFIRMED",
              code: { text: data.intolerances.trim() },
              patientId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(
          result.createAllergyIntolerance,
          "Failed to create intolerance record.",
        );
      })(),
    );
  }

  await Promise.all(promises);
}

export interface FoodFormData {
  included: string;
  excluded: string;
}

/**
 * Create diet-inclusion and/or diet-exclusion observations. Skips empty values.
 */
export async function createFoodObservations(
  data: FoodFormData,
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (data.included.trim()) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: CreateObservationMutation,
          variables: {
            input: {
              status: "FINAL",
              code: { text: "diet-inclusion" },
              valueString: data.included.trim(),
              note: [
                {
                  text: data.included.trim(),
                  authorString: "System",
                  time: new Date().toISOString(),
                },
              ],
              subjectId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(result.createObservation, "Failed to create diet inclusion record.");
      })(),
    );
  }

  if (data.excluded.trim()) {
    promises.push(
      (async () => {
        const result = await requestGraphql({
          document: CreateObservationMutation,
          variables: {
            input: {
              status: "FINAL",
              code: { text: "diet-exclusion" },
              valueString: data.excluded.trim(),
              note: [
                {
                  text: data.excluded.trim(),
                  authorString: "System",
                  time: new Date().toISOString(),
                },
              ],
              subjectId,
            },
          },
          organizationId,
        });
        unwrapMutationResult(result.createObservation, "Failed to create diet exclusion record.");
      })(),
    );
  }

  await Promise.all(promises);
}

export interface NoteFormData {
  title: string;
  body: string;
}

/**
 * Create one observation per note. Skips notes where both title and body are empty.
 */
export async function createNoteObservations(
  notes: NoteFormData[],
  subjectId: string,
  organizationId: string,
): Promise<void> {
  const validNotes = notes.filter((n) => n.title.trim() || n.body.trim());

  await Promise.all(
    validNotes.map(async (note) => {
      const valueString = note.title.trim()
        ? `${note.title.trim()}: ${note.body.trim()}`
        : note.body.trim();

      const result = await requestGraphql({
        document: CreateObservationMutation,
        variables: {
          input: {
            status: "FINAL",
            code: { text: "clinical-note" },
            valueString,
            note: [{ text: valueString, authorString: "System", time: new Date().toISOString() }],
            subjectId,
          },
        },
        organizationId,
      });
      unwrapMutationResult(result.createObservation, "Failed to create note observation.");
    }),
  );
}

// ---------------------------------------------------------------------------
// Batch submission
// ---------------------------------------------------------------------------

export interface OnboardingDraft {
  person: PersonFormData | null;
  subscription: SubscriptionFormData | null;
  objective: string | null;
  menstrualCycle: MenstrualCycleFormData | null;
  bodyMeasurements: BodyMeasurementsFormData | null;
  allergies: AllergiesFormData | null;
  food: FoodFormData | null;
  notes: NoteFormData[] | null;
}

function hasCycleData(d: MenstrualCycleFormData): boolean {
  return Boolean(d.startDate || d.endDate || d.notes.trim());
}

function hasMeasurementData(d: BodyMeasurementsFormData): boolean {
  return Boolean(d.heightCm || d.weightKg);
}

function hasAllergyData(d: AllergiesFormData): boolean {
  return Boolean(d.allergies.trim() || d.intolerances.trim());
}

function hasFoodData(d: FoodFormData): boolean {
  return Boolean(d.included.trim() || d.excluded.trim());
}

function hasNoteData(notes: NoteFormData[]): boolean {
  return notes.some((n) => n.title.trim() || n.body.trim());
}

/**
 * Submit the entire onboarding draft in one shot.
 * Creates the patient first (required for IDs), then fires remaining
 * mutations concurrently.
 */
export async function submitOnboarding(
  draft: OnboardingDraft,
  organizationId: string,
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
    concurrent.push(createObjective(draft.objective, patientId, organizationId));
  }
  if (draft.menstrualCycle && hasCycleData(draft.menstrualCycle)) {
    concurrent.push(
      createMenstrualCycleObservation(draft.menstrualCycle, patientId, organizationId),
    );
  }
  if (draft.bodyMeasurements && hasMeasurementData(draft.bodyMeasurements)) {
    concurrent.push(logBodyMeasurements(draft.bodyMeasurements, patientId, organizationId));
  }
  if (draft.allergies && hasAllergyData(draft.allergies)) {
    concurrent.push(createAllergiesAndIntolerances(draft.allergies, patientId, organizationId));
  }
  if (draft.food && hasFoodData(draft.food)) {
    concurrent.push(createFoodObservations(draft.food, patientId, organizationId));
  }
  if (draft.notes && hasNoteData(draft.notes)) {
    concurrent.push(createNoteObservations(draft.notes, patientId, organizationId));
  }

  await Promise.all(concurrent);
}
