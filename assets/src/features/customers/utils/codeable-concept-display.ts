/** Minimal shape for resolving a human-readable label from FHIR-style code data. */
export interface CodeableConceptDisplaySource {
  readonly text?: string | null;
  readonly coding?: ReadonlyArray<{
    readonly display?: string | null;
    readonly code?: string | null;
  } | null> | null;
}

/**
 * Resolves display text with this precedence: `code.text`, then the first
 * coding's localized `display`, and finally the raw coding `code`. The code
 * fallback ensures chips never render empty when a terminology lacks a
 * localized display for the active locale.
 */
export function displayTextFromCodeableConcept(
  code: CodeableConceptDisplaySource | null | undefined,
): string {
  const text = code?.text?.trim();
  if (text) {
    return text;
  }
  const firstCoding = code?.coding?.[0];
  const display = firstCoding?.display?.trim();
  if (display) {
    return display;
  }
  return firstCoding?.code?.trim() ?? "";
}
