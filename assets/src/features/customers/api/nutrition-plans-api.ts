import { graphql, type ResultOf } from "@/graphql";
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

// ─── Types ───────────────────────────────────────────────────────────

/** A single nutrition plan with macro and calorie targets. */
export type NutritionPlanRecord = NonNullable<
  NonNullable<
    NonNullable<ResultOf<typeof NutritionPlansByPersonQuery>["listPatients"]>["results"]
  >[number]["nutritionPlans"]
>[number];

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
