import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";
import type { AdministrativeGender } from "@/shared/types/schema-enums";

// ─── Queries ─────────────────────────────────────────────────────────

const PatientDetailByPersonQuery = graphql(`
  query PatientDetailByPerson($personId: ID!) {
    listPatients(filter: { personId: { eq: $personId } }, first: 1) {
      results {
        id
        personId
        person {
          id
          name {
            given
            family
          }
          telecom {
            system
            value
            use
          }
          gender
          birthDate
        }
        allergyIntolerances {
          id
          type
          clinicalStatus
          code {
            text
            coding {
              display
            }
          }
        }
        goals(
          filter: { lifecycleStatus: { eq: ACTIVE } }
          sort: [{ field: PRIORITY, order: ASC }]
        ) {
          id
          lifecycleStatus
          achievementStatus
          priority
          description {
            text
          }
          startDate
          dueDate
          category
        }
        nutritionPlans {
          id
          targetKcal
          proteinG
          carbsG
          fatG
        }
      }
    }
  }
`);

// ─── Mutations ───────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────

/** Form fields for creating a new person and their linked patient record. */
export interface PersonFormData {
  givenName: string;
  familyName: string;
  birthDate?: string;
  gender?: AdministrativeGender;
  phone?: string;
  email?: string;
  instagram?: string;
}

/** IDs returned after successfully creating a patient. */
export interface CreatePatientResult {
  patientId: string;
  personId: string;
}

/** Full patient record returned by the detail query. */
export type PatientDetail = NonNullable<
  NonNullable<ResultOf<typeof PatientDetailByPersonQuery>["listPatients"]>["results"]
>[number];

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Create a patient record alongside its linked person in a single mutation.
 * Returns the new patient and person IDs.
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

/**
 * Fetch the full patient detail for a person, including demographics, goals,
 * nutrition plans, and allergy intolerances. Returns null if no patient exists.
 */
export async function fetchPatientDetail(
  personId: string,
  organizationId: string,
): Promise<PatientDetail | null> {
  if (!personId || !organizationId) {
    return null;
  }

  const result = await requestGraphql({
    document: PatientDetailByPersonQuery,
    variables: { personId },
    organizationId,
  });

  return result.listPatients?.results?.[0] ?? null;
}
