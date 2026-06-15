import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

import type { NutritionPlanRecord } from "./patients-api";

// ─── Mutations ───────────────────────────────────────────────────────

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

const UpdateNutritionPlanMutation = graphql(`
  mutation UpdateNutritionPlan($id: ID!, $input: UpdateNutritionPlanInput) {
    updateNutritionPlan(id: $id, input: $input) {
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

const DeleteNutritionPlanMutation = graphql(`
  mutation DeleteNutritionPlan($id: ID!) {
    deleteNutritionPlan(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

/** A single nutrition plan row returned by the patient detail query. */
export type { NutritionPlanRecord };

/** The four persisted macro/calorie targets, as whole numbers. */
export interface NutritionPlanFormData {
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Best-effort recorded-at timestamp for a plan, read from its latest paper-trail
 * version (the resource's own timestamps are not exposed over GraphQL). Returns
 * an empty string when unavailable so it sorts last.
 */
export function nutritionPlanRecordedAt(plan: NutritionPlanRecord): string {
  return plan.paperTrailVersions?.[0]?.versionInsertedAt ?? "";
}

// ─── Functions ───────────────────────────────────────────────────────

/** Create a new nutrition plan for a patient. */
export async function createNutritionPlan(
  data: NutritionPlanFormData,
  patientId: string,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: CreateNutritionPlanMutation,
    variables: { input: { patientId, ...data } },
    organizationId,
  });
  unwrapMutationResult(result.createNutritionPlan, "Failed to create nutrition plan.");
}

/** Update the targets of an existing nutrition plan. */
export async function updateNutritionPlan(
  id: string,
  data: NutritionPlanFormData,
  organizationId: string,
): Promise<void> {
  const result = await requestGraphql({
    document: UpdateNutritionPlanMutation,
    variables: { id, input: data },
    organizationId,
  });
  unwrapMutationResult(result.updateNutritionPlan, "Failed to update nutrition plan.");
}

/** Archive (soft-delete) a nutrition plan. */
export async function removeNutritionPlan(id: string, organizationId: string): Promise<void> {
  const result = await requestGraphql({
    document: DeleteNutritionPlanMutation,
    variables: { id },
    organizationId,
  });
  unwrapMutationResult(result.deleteNutritionPlan, "Failed to remove nutrition plan.");
}
