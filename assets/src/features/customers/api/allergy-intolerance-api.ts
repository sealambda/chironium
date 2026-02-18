import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

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

/** Form data for the allergies and intolerances onboarding step. */
export interface AllergiesFormData {
  allergies: string;
  intolerances: string;
}

// ─── Functions ───────────────────────────────────────────────────────

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
