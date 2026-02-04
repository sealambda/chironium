// TEMPORARY: Remove when backend implements body metrics

export interface BodyMeasurements {
  chest?: number; // cm
  waist?: number; // cm
  hip?: number; // cm
  biceps?: number; // cm
  quadriceps?: number; // cm
}

export interface BodyMetricsRecord {
  id: string;
  customerId: string;
  date: string; // ISO date
  weight: number; // kg
  heightM: number; // meters (e.g., 1.75)
  bmi: number; // calculated: weight / heightM^2
  measurements: BodyMeasurements;
}
