import type { AnnotationInput } from "@/features/customers/api/observations-api";
import type { Annotation } from "@/shared/ui/notes-popover";

import { toAuthorInput } from "./annotation-author";

export type ClinicalAnnotationNoteAction =
  | { kind: "add"; text: string }
  | { kind: "update"; index: number; text: string }
  | { kind: "delete"; index: number };

/**
 * Builds the next annotation array for mutations that replace notes in full.
 */
export function buildUpdatedClinicalAnnotations(
  current: Annotation[],
  action: ClinicalAnnotationNoteAction,
  options: { currentUser?: { id?: string; name?: string | null } | null },
): AnnotationInput[] {
  const user = options.currentUser;
  const base = current.map((n) => ({
    text: n.text ?? "",
    ...toAuthorInput(n),
    time: n.time ?? undefined,
  }));
  if (action.kind === "add") {
    const authorInput = toAuthorInput({
      authorReference: user?.id,
      authorString: user?.name ?? undefined,
    });
    return [
      ...base,
      {
        text: action.text,
        ...authorInput,
        time: new Date().toISOString(),
      },
    ];
  }
  if (action.kind === "update") {
    return base.map((n, i) => (i === action.index ? { ...n, text: action.text } : n));
  }
  return base.filter((_, i) => i !== action.index);
}
