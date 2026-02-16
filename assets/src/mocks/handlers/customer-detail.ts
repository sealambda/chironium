import { HttpResponse } from "msw";

import { db } from "../db";
import { gql } from "./utils";

/**
 * Factory for creating customer data query handlers.
 * All customer detail queries follow the same pattern: filter by customerId.
 */
function createCustomerDataHandler<T extends { customerId: string }>(
  queryName: string,
  getCollection: () => T[],
  resultKey: string,
) {
  return gql.query(queryName, ({ variables }) => {
    const customerId = variables?.customerId as string | undefined;
    const results = customerId
      ? getCollection().filter((r) => r.customerId === customerId)
      : [];
    return HttpResponse.json({ data: { [resultKey]: { results } } });
  });
}

export const customerDetailHandlers = [
  createCustomerDataHandler(
    "SubscriptionHistory",
    () => db.subscriptionHistory,
    "subscriptionHistory",
  ),
  createCustomerDataHandler(
    "BodyMetricsHistory",
    () => db.bodyMetrics,
    "bodyMetricsHistory",
  ),
  createCustomerDataHandler(
    "NutritionPlansHistory",
    () => db.nutritionPlans,
    "nutritionPlansHistory",
  ),
];
