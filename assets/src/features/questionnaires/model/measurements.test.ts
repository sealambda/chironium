import { describe, expect, it } from "vitest";

import {
  findMeasurement,
  MEASUREMENT_CONCEPTS,
  measurementOf,
  measurementPatch,
  patchForKind,
  questionKindOf,
} from "@/features/questionnaires/model/measurements";
import type { QuestionnaireItem } from "@/features/questionnaires/model/questionnaire-schemas";

function questionWith(measurementId: string): QuestionnaireItem {
  const concept = findMeasurement(measurementId);
  if (!concept) {
    throw new Error(`unknown measurement ${measurementId}`);
  }
  return { linkId: "q1", text: "Q", ...measurementPatch(concept) } as QuestionnaireItem;
}

describe("questionKindOf", () => {
  it("reads every measurement concept back as a measurement", () => {
    // Regression: the food concepts are `type: "text"`, so deciding the kind from the FHIR
    // type alone flipped them back to Free text and hid the measurement picker.
    for (const concept of MEASUREMENT_CONCEPTS) {
      expect(questionKindOf(questionWith(concept.id)), concept.id).toBe("measurement");
    }
  });

  it("reads plain questions as text and option questions as coding", () => {
    expect(questionKindOf({ linkId: "a", type: "text" })).toBe("text");
    expect(questionKindOf({ linkId: "a", type: "string" })).toBe("text");
    expect(questionKindOf({ linkId: "a", type: "coding" })).toBe("coding");
  });
});

describe("patchForKind", () => {
  it("defaults a new measurement to the first concept, code and unit included", () => {
    const patch = patchForKind("measurement");
    expect(patch.type).toBe("quantity");
    expect(patch.code?.[0]?.code).toBe("29463-7");
    expect(patch.unit?.code).toBe("kg");
  });

  it("drops the measurement when switching to text or options", () => {
    for (const kind of ["text", "coding"] as const) {
      const patch = patchForKind(kind);
      expect(patch.code).toBeUndefined();
      expect(patch.unit).toBeUndefined();
    }
    expect(patchForKind("coding").type).toBe("coding");
    expect(patchForKind("text").type).toBe("text");
  });
});

describe("measurement concepts", () => {
  it("keeps ids and codes unique", () => {
    const ids = MEASUREMENT_CONCEPTS.map((concept) => concept.id);
    const codes = MEASUREMENT_CONCEPTS.map((concept) => `${concept.system}|${concept.code}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives a unit to quantity concepts only", () => {
    for (const concept of MEASUREMENT_CONCEPTS) {
      expect(Boolean(concept.unit), concept.id).toBe(concept.itemType === "quantity");
    }
  });

  it("round-trips each concept through measurementOf", () => {
    for (const concept of MEASUREMENT_CONCEPTS) {
      expect(measurementOf(questionWith(concept.id))?.id).toBe(concept.id);
    }
  });
});
