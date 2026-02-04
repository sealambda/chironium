import type { NutritionPlanRecord } from "@/mocks/types";

export const nutritionPlans: NutritionPlanRecord[] = [
  // Sara Olea Martín
  {
    id: "np-sara-1",
    customerId: "contact-sara",
    startDate: "2025-12-01",
    // No endDate = open-ended
    kcal: 1800,
    protein: 120,
    carbs: 180,
    fat: 60,
  },
  {
    id: "np-sara-2",
    customerId: "contact-sara",
    startDate: "2025-09-01",
    endDate: "2025-12-01",
    kcal: 1600,
    protein: 110,
    carbs: 160,
    fat: 53,
  },
  {
    id: "np-sara-3",
    customerId: "contact-sara",
    startDate: "2025-06-01",
    endDate: "2025-09-01",
    kcal: 1500,
    protein: 100,
    carbs: 150,
    fat: 50,
  },
  // Berta Guasch
  {
    id: "np-berta-1",
    customerId: "contact-berta",
    startDate: "2025-11-01",
    kcal: 1700,
    protein: 115,
    carbs: 170,
    fat: 57,
  },
  {
    id: "np-berta-2",
    customerId: "contact-berta",
    startDate: "2025-08-01",
    endDate: "2025-11-01",
    kcal: 1550,
    protein: 105,
    carbs: 155,
    fat: 52,
  },
  // Lorena Alfonso
  {
    id: "np-lorena-1",
    customerId: "contact-lorena",
    startDate: "2025-12-15",
    kcal: 2000,
    protein: 130,
    carbs: 200,
    fat: 67,
  },
  {
    id: "np-lorena-2",
    customerId: "contact-lorena",
    startDate: "2025-09-15",
    endDate: "2025-12-15",
    kcal: 1850,
    protein: 125,
    carbs: 185,
    fat: 62,
  },
];
