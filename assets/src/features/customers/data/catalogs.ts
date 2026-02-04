import type { CycleSymptom } from "@/mocks/types";

/**
 * Cycle Symptom Catalog
 * Common symptoms tracked during menstrual cycles
 */
export const CycleSymptomCatalog: CycleSymptom[] = [
  { id: "cramps", name: "Cramps" },
  { id: "bloating", name: "Bloating" },
  { id: "headache", name: "Headache" },
  { id: "fatigue", name: "Fatigue" },
  { id: "mood-swings", name: "Mood Swings" },
  { id: "breast-tenderness", name: "Breast Tenderness" },
  { id: "acne", name: "Acne" },
  { id: "nausea", name: "Nausea" },
  { id: "back-pain", name: "Back Pain" },
  { id: "insomnia", name: "Insomnia" },
];

/**
 * Helper to get symptom by ID
 */
export function getSymptomById(id: string): CycleSymptom | undefined {
  return CycleSymptomCatalog.find((symptom) => symptom.id === id);
}
