import type { BodyMetricsRecord, NutritionPlanRecord } from "@/mocks/types";

import { bodyMetrics } from "@/mocks/data/body-metrics";
import { nutritionPlans } from "@/mocks/data/nutrition-plans";

type DbShape = {
  bodyMetrics: BodyMetricsRecord[];
  nutritionPlans: NutritionPlanRecord[];
};

const seedData: DbShape = {
  bodyMetrics: [...bodyMetrics],
  nutritionPlans: [...nutritionPlans],
};

/**
 * Mock database for customer detail data not yet in the backend.
 * Will be removed when biometrics and nutrition plan APIs are implemented.
 */
export const db: DbShape = { ...seedData };
