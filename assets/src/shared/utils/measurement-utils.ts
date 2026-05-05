/**
 * Compute the difference between two numeric values.
 * Returns null if either value is undefined.
 */
export function computeDelta(
  current: number | undefined,
  previous: number | undefined,
): number | null {
  if (current === undefined || previous === undefined) {
    return null;
  }
  return Math.round((current - previous) * 10) / 10;
}

/**
 * Compute Waist-to-Hip Ratio. Returns null if either value is missing or hip is zero.
 */
export function computeWaistToHipRatio(
  waist: number | undefined,
  hip: number | undefined,
): number | null {
  if (waist === undefined || hip === undefined || hip === 0) {
    return null;
  }
  return waist / hip;
}

export type HealthClassification = "healthy" | "warning" | "danger";

/**
 * Classify BMI using WHO standard ranges.
 * <18.5 underweight (danger), 18.5–24.9 normal (healthy),
 * 25–29.9 overweight (warning), ≥30 obese (danger).
 */
export function classifyBmi(bmi: number): HealthClassification {
  if (bmi < 18.5) {
    return "danger";
  }
  if (bmi < 25) {
    return "healthy";
  }
  if (bmi < 30) {
    return "warning";
  }
  return "danger";
}

/** Format any anthropometric measurement to one decimal place for consistent display. */
export function formatAnthropometryValue(n: number): string {
  return n.toFixed(1);
}

/**
 * Classify Waist-to-Hip Ratio (gender-neutral thresholds).
 * <0.80 low risk (healthy), 0.80–0.85 moderate (warning), >0.85 high (danger).
 */
export function classifyWhr(whr: number): HealthClassification {
  if (whr < 0.8) {
    return "healthy";
  }
  if (whr <= 0.85) {
    return "warning";
  }
  return "danger";
}
