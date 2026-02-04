import type { CycleSymptom, Pathology } from "@/mocks/types";

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
 * Pathology Catalog
 * Common health conditions that practitioners may track for clients
 */
export const PathologyCatalog: Pathology[] = [
  { id: "hypertension", name: "Hypertension", category: "cardiovascular" },
  { id: "diabetes-t2", name: "Type 2 Diabetes", category: "metabolic" },
  { id: "hypothyroidism", name: "Hypothyroidism", category: "hormonal" },
  { id: "pcos", name: "Polycystic Ovary Syndrome", category: "hormonal" },
  { id: "ibs", name: "Irritable Bowel Syndrome", category: "digestive" },
  { id: "asthma", name: "Asthma", category: "respiratory" },
  {
    id: "osteoarthritis",
    name: "Osteoarthritis",
    category: "musculoskeletal",
  },
  { id: "gerd", name: "Gastroesophageal Reflux", category: "digestive" },
  { id: "anemia", name: "Anemia", category: "metabolic" },
  { id: "anxiety", name: "Anxiety Disorder", category: "other" },
];

/**
 * Helper to get symptom by ID
 */
export function getSymptomById(id: string): CycleSymptom | undefined {
  return CycleSymptomCatalog.find((symptom) => symptom.id === id);
}

/**
 * Helper to get pathology by ID
 */
export function getPathologyById(id: string): Pathology | undefined {
  return PathologyCatalog.find((pathology) => pathology.id === id);
}
