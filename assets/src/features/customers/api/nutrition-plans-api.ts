import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

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
export type { NutritionPlanRecord } from "./patients-api";

/** Form data for creating a new nutrition plan. */
export interface NutritionPlanFormData {
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// ─── Functions ───────────────────────────────────────────────────────

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
