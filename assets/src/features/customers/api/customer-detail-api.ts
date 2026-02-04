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
          hip
          waist
          chest
          bicepsLeft
          bicepsRight
          quadricepsLeft
          quadricepsRight
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

// Response types matching MSW mock handler responses

type SubscriptionHistoryResponse = {
  subscriptionHistory: {
    results: SubscriptionHistoryRecord[];
  };
};

type BodyMetricsHistoryResponse = {
  bodyMetricsHistory: {
    results: BodyMetricsRecord[];
  };
};

type NutritionPlansHistoryResponse = {
  nutritionPlansHistory: {
    results: NutritionPlanRecord[];
  };
};

type CycleHistoryResponse = {
  cycleHistory: {
    results: CycleRecord[];
  };
};

type PathologiesListResponse = {
  pathologiesList: {
    results: PathologyRecord[];
  };
};

/**
 * Fetch subscription history for a customer.
 */
export async function fetchSubscriptionHistory(
  customerId: string,
  organizationId: string,
): Promise<SubscriptionHistoryRecord[]> {
  if (!customerId || !organizationId) {
    return [];
  }

  const result = await requestGraphql<SubscriptionHistoryResponse>({
    document: SubscriptionHistoryQuery,
    variables: { customerId },
    organizationId,
  });

  return result.subscriptionHistory?.results ?? [];
}

/**
 * Fetch body metrics history for a customer.
 */
export async function fetchBodyMetrics(
  customerId: string,
  organizationId: string,
): Promise<BodyMetricsRecord[]> {
  if (!customerId || !organizationId) {
    return [];
  }

  const result = await requestGraphql<BodyMetricsHistoryResponse>({
    document: BodyMetricsHistoryQuery,
    variables: { customerId },
    organizationId,
  });

  return result.bodyMetricsHistory?.results ?? [];
}

/**
 * Fetch nutrition plans history for a customer.
 */
export async function fetchNutritionPlans(
  customerId: string,
  organizationId: string,
): Promise<NutritionPlanRecord[]> {
  if (!customerId || !organizationId) {
    return [];
  }

  const result = await requestGraphql<NutritionPlansHistoryResponse>({
    document: NutritionPlansHistoryQuery,
    variables: { customerId },
    organizationId,
  });

  return result.nutritionPlansHistory?.results ?? [];
}

/**
 * Fetch cycle history for a customer.
 */
export async function fetchCycleHistory(
  customerId: string,
  organizationId: string,
): Promise<CycleRecord[]> {
  if (!customerId || !organizationId) {
    return [];
  }

  const result = await requestGraphql<CycleHistoryResponse>({
    document: CycleHistoryQuery,
    variables: { customerId },
    organizationId,
  });

  return result.cycleHistory?.results ?? [];
}

/**
 * Fetch pathologies list for a customer.
 */
export async function fetchPathologies(
  customerId: string,
  organizationId: string,
): Promise<PathologyRecord[]> {
  if (!customerId || !organizationId) {
    return [];
  }

  const result = await requestGraphql<PathologiesListResponse>({
    document: PathologiesListQuery,
    variables: { customerId },
    organizationId,
  });

  return result.pathologiesList?.results ?? [];
}
