import type { PatientObservation } from "@/features/customers/api/patients-api";

/** Measurement keys that map to a FHIR quantity unit. Mirrors `AnthropometryMeasureKey`. */
type QuantityMeasureKey = "weight" | "height" | "chest" | "waist" | "hip" | "arm" | "thigh";

export const UNIT_OF_MEASURE_SYSTEM = "http://unitsofmeasure.org";

/** Parse the numeric value from a FHIR valueQuantity string, returning undefined on NaN or missing data. */
export function extractValue(obs: PatientObservation | undefined): number | undefined {
  if (!obs?.valueQuantity?.value) {
    return undefined;
  }
  const n = Number.parseFloat(obs.valueQuantity.value);
  return Number.isNaN(n) ? undefined : n;
}

/** Round to at most two decimals, leaving integers untouched. */
export function normalizeQuantity(value: number): number {
  return Number.isInteger(value) ? value : Number(value.toFixed(2));
}

/** The UCUM unit code a measurement is recorded in: weight in kg, everything else in cm. */
export function quantityCodeForObservation(observationKey: QuantityMeasureKey): "kg" | "cm" {
  return observationKey === "weight" ? "kg" : "cm";
}
