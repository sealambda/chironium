/** Minimal shape for resolving a human-readable label from FHIR-style code data. */
export interface CodeableConceptDisplaySource {
  readonly text?: string | null;
  readonly coding?: ReadonlyArray<{ readonly display?: string | null } | null> | null;
}

/**
 * Resolves display text: prefers `code.text`, then the first coding's localized display.
 */
export function displayTextFromCodeableConcept(
  code: CodeableConceptDisplaySource | null | undefined,
): string {
  const text = code?.text?.trim();
  if (text) {
    return text;
  }
  const display = code?.coding?.[0]?.display?.trim();
  return display ?? "";
}
