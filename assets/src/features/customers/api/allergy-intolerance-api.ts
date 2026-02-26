import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const GetPatientAllergyIntolerancesQuery = graphql(`
  query GetPatientAllergyIntolerances($patientId: ID!) {
    getPatient(id: $patientId) {
      allergyIntolerances {
        id
        type
        clinicalStatus
        code {
          text
        }
      }
    }
  }
`);

// ─── Mutations ───────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────

/** A single allergy or intolerance record returned by the patient query. */
export type AllergyIntoleranceItem = NonNullable<
  NonNullable<
    ResultOf<typeof GetPatientAllergyIntolerancesQuery>["getPatient"]
  >["allergyIntolerances"]
>[number];

/** Form data for the allergies and intolerances onboarding step. */
export interface AllergiesFormData {
  allergies: string;
  intolerances: string;
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch all allergy and intolerance records for a patient.
 */
export async function fetchAllergyIntolerances(
  patientId: string,
  organizationId: string,
): Promise<AllergyIntoleranceItem[]> {
  if (!patientId || !organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: GetPatientAllergyIntolerancesQuery,
    variables: { patientId },
    organizationId,
  });

  return result.getPatient?.allergyIntolerances ?? [];
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
