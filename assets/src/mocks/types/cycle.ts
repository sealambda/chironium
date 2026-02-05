// TEMPORARY: Remove when backend implements cycle tracking

export interface CycleRecord {
  id: string;
  customerId: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date, undefined = ongoing
  cycleLength?: number; // period duration in days (bleeding days)
  symptoms: string[]; // symptom IDs from CycleSymptomCatalog
}

export interface CycleSymptom {
  id: string;
  name: string;
}
