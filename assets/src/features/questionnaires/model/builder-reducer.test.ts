import { describe, expect, it } from "vitest";

import {
  type BuilderState,
  builderReducer,
  emptyBuilderState,
  hasOptionlessChoices,
  pruneEmptyOptions,
} from "@/features/questionnaires/model/builder-reducer";
import {
  clearMeasurementPatch,
  findMeasurement,
  measurementOf,
  measurementPatch,
} from "@/features/questionnaires/model/measurements";
import type { QuestionnaireItem } from "@/features/questionnaires/model/questionnaire-schemas";

function stateWith(items: QuestionnaireItem[]): BuilderState {
  return { ...emptyBuilderState(), items };
}

describe("builderReducer addItem / removeItem", () => {
  it("appends a free-text question and focuses it", () => {
    const next = builderReducer(emptyBuilderState(), { type: "addItem", itemType: "text" });
    expect(next.items).toEqual([{ linkId: "q1", type: "text", text: "" }]);
    expect(next.focusLinkId).toBe("q1");
    expect(next.counter).toBe(2);
  });

  it("removes the question", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "q1", type: "text" },
      { linkId: "q2", type: "text" },
    ];
    const next = builderReducer(stateWith(items), { type: "removeItem", linkId: "q1" });
    expect(next.items.map((node) => node.linkId)).toEqual(["q2"]);
  });
});

describe("builderReducer duplicateItem", () => {
  it("copies the question with a fresh linkId, right after the original", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "q1", type: "coding", text: "Pick", answerOption: [{ valueString: "A" }] },
      { linkId: "q2", type: "text" },
    ];
    const next = builderReducer(
      { ...stateWith(items), counter: 3 },
      {
        type: "duplicateItem",
        linkId: "q1",
      },
    );

    expect(next.items).toHaveLength(3);
    expect(next.items[0]?.linkId).toBe("q1");
    expect(next.items[2]?.linkId).toBe("q2");
    expect(next.items[1]?.linkId).not.toBe("q1");
    expect(next.items[1]?.text).toBe("Pick");
    expect(next.focusLinkId).toBe(next.items[1]?.linkId);
  });
});

describe("builderReducer updateItem", () => {
  it("drops incompatible props when the type changes", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "q1", type: "coding", answerOption: [{ valueString: "A" }] },
    ];
    const next = builderReducer(stateWith(items), {
      type: "updateItem",
      linkId: "q1",
      patch: { type: "text" },
    });
    expect(next.items[0]?.answerOption).toBeUndefined();
  });

  it("seeds one blank option when switching to Options", () => {
    const next = builderReducer(stateWith([{ linkId: "q1", type: "text" }]), {
      type: "updateItem",
      linkId: "q1",
      patch: { type: "coding" },
    });
    expect(next.items[0]?.answerOption).toEqual([{ valueString: "" }]);
  });

  it("keeps props when only the text changes", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "q1", type: "coding", answerOption: [{ valueString: "A" }] },
    ];
    const next = builderReducer(stateWith(items), {
      type: "updateItem",
      linkId: "q1",
      patch: { text: "Pain" },
    });
    expect(next.items[0]?.answerOption).toEqual([{ valueString: "A" }]);
  });
});

describe("measurement questions", () => {
  it("turning a question into a measurement sets type, code and unit together", () => {
    const weight = findMeasurement("weight");
    expect(weight).toBeDefined();
    if (!weight) {
      return;
    }
    const next = builderReducer(stateWith([{ linkId: "q1", type: "text", text: "Weight" }]), {
      type: "updateItem",
      linkId: "q1",
      patch: measurementPatch(weight),
    });
    const item = next.items[0];
    expect(item?.type).toBe("quantity");
    expect(item?.code).toEqual([
      { system: "http://loinc.org", code: "29463-7", display: "Body weight" },
    ]);
    expect(item?.unit?.code).toBe("kg");
    expect(measurementOf(item as QuestionnaireItem)?.id).toBe("weight");
  });

  it("switching a measurement to another measurement replaces its code and unit", () => {
    const height = findMeasurement("height");
    const periodStart = findMeasurement("period_start");
    if (!height || !periodStart) {
      throw new Error("missing measurement fixtures");
    }
    const withHeight = builderReducer(stateWith([{ linkId: "q1", type: "text" }]), {
      type: "updateItem",
      linkId: "q1",
      patch: measurementPatch(height),
    });
    const next = builderReducer(withHeight, {
      type: "updateItem",
      linkId: "q1",
      patch: measurementPatch(periodStart),
    });
    const item = next.items[0];
    expect(item?.type).toBe("date");
    expect(item?.unit).toBeUndefined();
    expect(measurementOf(item as QuestionnaireItem)?.id).toBe("period_start");
  });

  it("clearing a measurement returns the question to free text", () => {
    const weight = findMeasurement("weight");
    if (!weight) {
      throw new Error("missing measurement fixtures");
    }
    const asMeasurement = builderReducer(stateWith([{ linkId: "q1", type: "text" }]), {
      type: "updateItem",
      linkId: "q1",
      patch: measurementPatch(weight),
    });
    const next = builderReducer(asMeasurement, {
      type: "updateItem",
      linkId: "q1",
      patch: clearMeasurementPatch(),
    });
    const item = next.items[0];
    expect(item?.type).toBe("text");
    expect(item?.code).toBeUndefined();
    expect(item?.unit).toBeUndefined();
  });
});

describe("pre-save authoring checks", () => {
  it("flags an Options question with no filled option and prunes blank rows", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "a", type: "coding", answerOption: [{ valueString: "" }] },
    ];
    expect(hasOptionlessChoices(items)).toBe(true);

    const filled: QuestionnaireItem[] = [
      { linkId: "a", type: "coding", answerOption: [{ valueString: "Yes" }, { valueString: "" }] },
    ];
    expect(hasOptionlessChoices(filled)).toBe(false);
    expect(pruneEmptyOptions(filled)[0]?.answerOption).toEqual([{ valueString: "Yes" }]);
  });
});
