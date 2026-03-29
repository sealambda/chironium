import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import type { TerminologyTag } from "@/shared/types/terminology";

type CodeableLike =
  | {
      text?: string | null;
      coding?:
        | {
            system?: string | null;
            code?: string | null;
            version?: string | null;
            display?: string | null;
          }[]
        | null;
    }
  | null
  | undefined;

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

export function terminologyTagFromCodeable(code: CodeableLike): TerminologyTag | null {
  const fromDisplay = displayTextFromCodeableConcept(code).trim();
  const fromText = code?.text?.trim() ?? "";
  const c = code?.coding?.[0];
  const label =
    fromDisplay ||
    fromText ||
    (c?.display?.trim() ? c.display.trim() : "") ||
    (c?.code ? String(c.code) : "");
  if (!label && !(c?.system && c?.code)) {
    return null;
  }
  if (c?.system && c?.code) {
    return {
      label: label || c.display || String(c.code),
      coding: {
        system: c.system,
        code: c.code,
        version: c.version ?? null,
        display: c.display ?? null,
      },
    };
  }
  return { label };
}
