import { describe, expect, it } from "vitest";

import {
  type BuilderState,
  builderReducer,
  emptyBuilderState,
  hasIncompleteConditions,
  hasInvalidScaleBounds,
  needsAdvancedAuthoring,
  precedingQuestions,
} from "@/features/questionnaires/model/builder-reducer";
import type { QuestionnaireItem } from "@/features/questionnaires/model/questionnaire-schemas";

function stateWith(items: QuestionnaireItem[]): BuilderState {
  return { ...emptyBuilderState(), items };
}

const conditionalItems: QuestionnaireItem[] = [
  {
    linkId: "female",
    type: "group",
    text: "Female health",
    item: [{ linkId: "period", type: "boolean", text: "Period started?" }],
  },
  {
    linkId: "period_start",
    type: "date",
    text: "Start date",
    enableWhen: [{ question: "period", operator: "=", answerBoolean: true }],
  },
];

describe("builderReducer removeItem", () => {
  it("strips conditions referencing the removed question", () => {
    const next = builderReducer(stateWith(conditionalItems), {
      type: "removeItem",
      linkId: "period",
    });
    const dependent = next.items.find((node) => node.linkId === "period_start");
    expect(dependent?.enableWhen).toBeUndefined();
  });

  it("strips conditions referencing questions inside a removed group", () => {
    const next = builderReducer(stateWith(conditionalItems), {
      type: "removeItem",
      linkId: "female",
    });
    expect(next.items.map((node) => node.linkId)).toEqual(["period_start"]);
    expect(next.items[0]?.enableWhen).toBeUndefined();
  });
});

describe("builderReducer updateItem", () => {
  it("drops incompatible props when the type changes", () => {
    const items: QuestionnaireItem[] = [
      {
        linkId: "q1",
        type: "coding",
        answerOption: [{ valueString: "A" }],
        required: true,
      },
    ];
    const next = builderReducer(stateWith(items), {
      type: "updateItem",
      linkId: "q1",
      patch: { type: "integer" },
    });
    expect(next.items[0]?.answerOption).toBeUndefined();
    expect(next.items[0]?.required).toBe(true);
  });

  it("keeps props when only the text changes", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "q1", type: "integer", minValue: 1, maxValue: 10 },
    ];
    const next = builderReducer(stateWith(items), {
      type: "updateItem",
      linkId: "q1",
      patch: { text: "Pain" },
    });
    expect(next.items[0]?.minValue).toBe(1);
  });
});

describe("precedingQuestions", () => {
  it("returns only answerable questions before the target", () => {
    const sources = precedingQuestions(conditionalItems, "period_start");
    expect(sources.map((node) => node.linkId)).toEqual(["period"]);
  });

  it("does not offer questions that come after the target", () => {
    const sources = precedingQuestions(conditionalItems, "period");
    expect(sources).toEqual([]);
  });
});

describe("needsAdvancedAuthoring", () => {
  it("stays simple for free-text and options questions", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "a", type: "text" },
      { linkId: "b", type: "coding", answerOption: [{ valueString: "Yes" }], repeats: true },
    ];
    expect(needsAdvancedAuthoring(items)).toBe(false);
  });

  it("turns on for sections, conditions, codes, scales, and other types", () => {
    expect(needsAdvancedAuthoring([{ linkId: "a", type: "group" }])).toBe(true);
    expect(needsAdvancedAuthoring(conditionalItems)).toBe(true);
    expect(
      needsAdvancedAuthoring([{ linkId: "a", type: "integer", minValue: 1, maxValue: 10 }]),
    ).toBe(true);
    expect(
      needsAdvancedAuthoring([
        { linkId: "a", type: "text", code: [{ system: "http://loinc.org", code: "1" }] },
      ]),
    ).toBe(true);
  });
});

describe("pre-save authoring checks", () => {
  it("flags a comparison condition without a value", () => {
    const items: QuestionnaireItem[] = [
      { linkId: "a", type: "integer" },
      { linkId: "b", type: "text", enableWhen: [{ question: "a", operator: ">" }] },
    ];
    expect(hasIncompleteConditions(items)).toBe(true);
    expect(hasIncompleteConditions(conditionalItems)).toBe(false);
  });

  it("flags inverted scale bounds", () => {
    expect(
      hasInvalidScaleBounds([{ linkId: "a", type: "integer", minValue: 10, maxValue: 1 }]),
    ).toBe(true);
    expect(
      hasInvalidScaleBounds([{ linkId: "a", type: "integer", minValue: 1, maxValue: 10 }]),
    ).toBe(false);
  });
});
