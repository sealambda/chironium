import { gql } from "graphql-request";

import type {
  BodyMetricsRecord,
  CycleRecord,
  NutritionPlanRecord,
  PathologyRecord,
  SubscriptionHistoryRecord,
} from "@/mocks/types";
import { requestGraphql } from "@/shared/api/graphql";

/**
 * GraphQL queries for customer detail data.
 * These match the MSW mock handler operation names.
 */

const SubscriptionHistoryQuery = gql`
  query SubscriptionHistory($customerId: String!) {
    subscriptionHistory(customerId: $customerId) {
      results {
        id
        customerId
        startDate
        endDate
        planDurationMonths
        status
        notes
      }
    }
  }
`;

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

const CycleHistoryQuery = gql`
  query CycleHistory($customerId: String!) {
    cycleHistory(customerId: $customerId) {
      results {
        id
        customerId
        startDate
        endDate
        cycleLength
        symptoms
      }
    }
  }
`;

const PathologiesListQuery = gql`
  query PathologiesList($customerId: String!) {
    pathologiesList(customerId: $customerId) {
      results {
        id
        customerId
        pathologyId
        pathologyName
        category
        status
        diagnosedDate
        notes
      }
    }
  }
`;

// Generic response type for customer data queries
type CustomerDataResponse<K extends string, T> = {
  [key in K]: { results: T[] };
};

/**
 * Generic fetcher for customer-scoped GraphQL queries.
 * Handles validation and result extraction with consistent error handling.
 */
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

/** Fetch subscription history for a customer. */
export const fetchSubscriptionHistory = (
  customerId: string,
  organizationId: string,
) =>
  fetchCustomerData<"subscriptionHistory", SubscriptionHistoryRecord>(
    customerId,
    organizationId,
    SubscriptionHistoryQuery,
    "subscriptionHistory",
  );

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

/** Fetch cycle history for a customer. */
export const fetchCycleHistory = (customerId: string, organizationId: string) =>
  fetchCustomerData<"cycleHistory", CycleRecord>(
    customerId,
    organizationId,
    CycleHistoryQuery,
    "cycleHistory",
  );

/** Fetch pathologies list for a customer. */
export const fetchPathologies = (customerId: string, organizationId: string) =>
  fetchCustomerData<"pathologiesList", PathologyRecord>(
    customerId,
    organizationId,
    PathologiesListQuery,
    "pathologiesList",
  );
