import type { TerminologyTag } from "@/shared/types/terminology";

/** Builds GraphQL CodeableConcept-style input from a terminology tag. */
export function codeInputFromTerminologyTag(tag: TerminologyTag): {
  text: string;
  coding?: { system: string; code: string; version?: string }[];
} {
  if (tag.coding) {
    return {
      text: tag.label,
      coding: [
        {
          system: tag.coding.system,
          code: tag.coding.code,
          version: tag.coding.version ?? undefined,
        },
      ],
    };
  }
  return { text: tag.label };
}

/** Builds observation valueCodeableConcept input (text + coding). */
export function observationValueCodeInputFromTerminologyTag(tag: TerminologyTag): {
  text: string;
  coding: { system: string; code: string; version?: string }[];
} | null {
  if (!tag.coding) {
    return null;
  }
  return {
    text: tag.label,
    coding: [
      {
        system: tag.coding.system,
        code: tag.coding.code,
        version: tag.coding.version ?? undefined,
      },
    ],
  };
}
