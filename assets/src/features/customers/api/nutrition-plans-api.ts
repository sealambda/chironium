import { graphql, type ResultOf } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const NutritionPlansByPersonQuery = graphql(`
  query NutritionPlansByPerson($personId: ID!) {
    listPatients(filter: { personId: { eq: $personId } }, first: 1) {
      results {
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

// ─── Mutations ──────────────────────────────────────────────────────

const CreateNutritionPlanMutation = graphql(`
  mutation CreateNutritionPlan($input: CreateNutritionPlanInput!) {
    createNutritionPlan(input: $input) {
      result {
        id
        targetKcal
        proteinG
        carbsG
        fatG
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** A single nutrition plan with macro and calorie targets. */
export type NutritionPlanRecord = NonNullable<
  NonNullable<
    NonNullable<ResultOf<typeof NutritionPlansByPersonQuery>["listPatients"]>["results"]
  >[number]["nutritionPlans"]
>[number];

/** Form data for creating a new nutrition plan. */
export interface NutritionPlanFormData {
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// ─── Functions ───────────────────────────────────────────────────────

/**
 * Fetch nutrition plans for a person via their patient record.
 */
export async function fetchNutritionPlans(
  personId: string,
  organizationId: string,
): Promise<NutritionPlanRecord[]> {
  if (!personId || !organizationId) {
    return [];
  }

  const data = await requestGraphql({
    document: NutritionPlansByPersonQuery,
    variables: { personId },
    organizationId,
  });

  const patient = data.listPatients?.results?.[0];
  return patient?.nutritionPlans ?? [];
}

/**
 * Create a new nutrition plan for a patient.
 */
export async function createNutritionPlan(
  data: NutritionPlanFormData,
  patientId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateNutritionPlanMutation,
    variables: {
      input: {
        patientId,
        targetKcal: data.targetKcal,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
      },
    },
    organizationId,
  });
  unwrapMutationResult(result.createNutritionPlan, "Failed to create nutrition plan.");
}
