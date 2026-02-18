import { gql } from "graphql-request";

import type { BodyMetricsRecord, NutritionPlanRecord } from "@/mocks/types";
import { requestGraphql } from "@/shared/api/graphql";

/**
 * MSW-intercepted queries for customer detail data not yet in the backend.
 * Will be removed when biometrics and nutrition plan APIs are implemented.
 */

const BodyMetricsHistoryQuery = gql`
  query BodyMetricsHistory($customerId: String!) {
    bodyMetricsHistory(customerId: $customerId) {
      results {
        id
        customerId
        date
        weight
        heightM
        bmi
        measurements {
          chest
          waist
          hip
          biceps
          quadriceps
        }
      }
    }
  }
`;

const NutritionPlansHistoryQuery = gql`
  query NutritionPlansHistory($customerId: String!) {
    nutritionPlansHistory(customerId: $customerId) {
      results {
        id
        customerId
        startDate
        endDate
        kcal
        protein
        carbs
        fat
      }
    }
  }
`;

type CustomerDataResponse<K extends string, T> = {
  [key in K]: { results: T[] };
};

async function fetchCustomerData<K extends string, T>(
  customerId: string,
  organizationId: string,
  document: string,
  resultKey: K,
): Promise<T[]> {
  if (!customerId || !organizationId) {
    return [];
  }

  const result = await requestGraphql<CustomerDataResponse<K, T>>({
    document,
    variables: { customerId },
    organizationId,
  });

  return result[resultKey]?.results ?? [];
}

/** Fetch body metrics history for a customer. */
export const fetchBodyMetrics = (customerId: string, organizationId: string) =>
  fetchCustomerData<"bodyMetricsHistory", BodyMetricsRecord>(
    customerId,
    organizationId,
    BodyMetricsHistoryQuery,
    "bodyMetricsHistory",
  );

/** Fetch nutrition plans history for a customer. */
export const fetchNutritionPlans = (
  customerId: string,
  organizationId: string,
) =>
  fetchCustomerData<"nutritionPlansHistory", NutritionPlanRecord>(
    customerId,
    organizationId,
    NutritionPlansHistoryQuery,
    "nutritionPlansHistory",
  );
