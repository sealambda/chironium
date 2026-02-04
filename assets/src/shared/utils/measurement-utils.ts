/**
 * Convert height from meters to centimeters.
 */
export function heightMetersToCm(heightM: number): number {
  return Math.round(heightM * 100);
}
