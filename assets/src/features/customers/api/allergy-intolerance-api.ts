import { toAuthorInput } from "@/features/customers/utils/annotation-author";
import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

import type { AnnotationInput } from "./observations-api";

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
          coding {
            system
            code
            version
            display
          }
        }
        note {
          text
          time
          authorReference
          authorString
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

const UpdateAllergyIntoleranceMutation = graphql(`
  mutation UpdateAllergyIntolerance(
    $id: ID!
    $input: UpdateAllergyIntoleranceInput
  ) {
    updateAllergyIntolerance(id: $id, input: $input) {
      result {
        id
        note {
          text
          time
          authorReference
          authorString
        }
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
  allergies: string[];
  intolerances: string[];
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
 * Create one record per tag for allergies and intolerances.
 */
export async function createAllergiesAndIntolerances(
  data: AllergiesFormData,
  patientId: string,
  organizationId: string,
): Promise<void> {
  const makeRecord = (type: "ALLERGY" | "INTOLERANCE", tag: string) =>
    (async () => {
      const result = await requestGraphql({
        document: CreateAllergyIntoleranceMutation,
        variables: {
          input: {
            type,
            clinicalStatus: "ACTIVE",
            verificationStatus: "CONFIRMED",
            code: { text: tag },
            patientId,
          },
        },
        organizationId,
      });
      unwrapMutationResult(
        result.createAllergyIntolerance,
        `Failed to create ${type.toLowerCase()} record.`,
      );
    })();

  await Promise.all([
    ...data.allergies.map((tag) => makeRecord("ALLERGY", tag)),
    ...data.intolerances.map((tag) => makeRecord("INTOLERANCE", tag)),
  ]);
}

/**
 * Replace the annotation notes array on an allergy or intolerance record.
 * Sends the full notes array — partial updates are not supported by the API.
 */
export async function updateAllergyIntoleranceNotes(
  id: string,
  notes: AnnotationInput[],
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAllergyIntoleranceMutation,
    variables: {
      id,
      input: {
        note: notes.map((n) => ({
          text: n.text,
          ...toAuthorInput(n),
          time: n.time ?? undefined,
        })),
      },
    },
    organizationId,
  });
  unwrapMutationResult(
    result.updateAllergyIntolerance,
    "Failed to update allergy/intolerance notes.",
  );
}

/**
 * Update the display text of an uncoded allergy or intolerance record.
 * Only valid for records without a coded concept (code.coding is empty).
 */
export async function updateAllergyIntoleranceCode(
  id: string,
  text: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateAllergyIntoleranceMutation,
    variables: { id, input: { code: { text } } },
    organizationId,
  });
  unwrapMutationResult(result.updateAllergyIntolerance, "Failed to update record.");
}
