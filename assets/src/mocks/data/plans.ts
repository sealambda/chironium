// Subscription plans seed data

export interface PlanSeed {
  id: string;
  name: string;
  periodDuration: string; // ISO 8601 duration (e.g., "P6M" = 6 months)
}

export const plans: PlanSeed[] = [
  { id: "plan-3m", name: "3 month plan", periodDuration: "P3M" },
  { id: "plan-6m", name: "6 month plan", periodDuration: "P6M" },
  { id: "plan-12m", name: "12 month plan", periodDuration: "P12M" },
];
