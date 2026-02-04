// TEMPORARY: Remove when backend implements nutrition plans

export interface NutritionPlanRecord {
  id: string;
  customerId: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date, undefined = open-ended
  kcal: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}
