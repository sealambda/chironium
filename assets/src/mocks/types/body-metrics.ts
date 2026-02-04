// TEMPORARY: Remove when backend implements body metrics

export interface BodyMeasurements {
  hip?: number; // cm
  waist?: number; // cm
  chest?: number; // cm
  bicepsLeft?: number; // cm
  bicepsRight?: number; // cm
  quadricepsLeft?: number; // cm
  quadricepsRight?: number; // cm
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
