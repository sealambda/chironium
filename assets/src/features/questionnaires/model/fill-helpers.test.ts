import { describe, expect, it } from "vitest";

import {
  type AnswerMap,
  buildResponseTree,
  isEnabled,
  missingRequired,
} from "@/features/questionnaires/model/fill-helpers";
import type { QuestionnaireItem } from "@/features/questionnaires/model/questionnaire-schemas";

const weightItem: QuestionnaireItem = {
  linkId: "weight",
  type: "quantity",
  text: "Body weight",
};

describe("isEnabled", () => {
  it("shows items with no conditions", () => {
    expect(isEnabled(weightItem, {})).toBe(true);
  });

  it("honors an `exists` condition", () => {
    const item: QuestionnaireItem = {
      linkId: "details",
      type: "text",
      enableWhen: [{ question: "pregnant", operator: "exists", answerBoolean: true }],
    };
    expect(isEnabled(item, {})).toBe(false);
    expect(isEnabled(item, { pregnant: { valueBoolean: true } })).toBe(true);
  });

  it("honors an equality condition", () => {
    const item: QuestionnaireItem = {
      linkId: "weeks",
      type: "integer",
      enableWhen: [{ question: "pregnant", operator: "=", answerBoolean: true }],
    };
    expect(isEnabled(item, { pregnant: { valueBoolean: false } })).toBe(false);
    expect(isEnabled(item, { pregnant: { valueBoolean: true } })).toBe(true);
  });

  it("combines conditions with enableBehavior", () => {
    const base: Omit<QuestionnaireItem, "enableBehavior"> = {
      linkId: "x",
      type: "text",
      enableWhen: [
        { question: "a", operator: "exists", answerBoolean: true },
        { question: "b", operator: "exists", answerBoolean: true },
      ],
    };
    const answers: AnswerMap = { a: { valueString: "yes" } };
    expect(isEnabled({ ...base, enableBehavior: "any" }, answers)).toBe(true);
    expect(isEnabled({ ...base, enableBehavior: "all" }, answers)).toBe(false);
  });
});

describe("buildResponseTree", () => {
  const items: QuestionnaireItem[] = [
    {
      linkId: "anthro",
      type: "group",
      text: "Anthropometry",
      item: [
        weightItem,
        {
          linkId: "followup",
          type: "text",
          enableWhen: [{ question: "weight", operator: "exists", answerBoolean: true }],
        },
      ],
    },
  ];

  it("nests answered items under their group and drops hidden ones", () => {
    const answers: AnswerMap = { weight: { valueQuantity: { value: 72 } } };
    const tree = buildResponseTree(items, answers);

    expect(tree).toEqual([
      {
        linkId: "anthro",
        item: [{ linkId: "weight", answer: [{ valueQuantity: { value: 72 } }] }],
      },
    ]);
  });

  it("includes a follow-up answer once its condition is met", () => {
    const answers: AnswerMap = {
      weight: { valueQuantity: { value: 72 } },
      followup: { valueString: "stable" },
    };
    const tree = buildResponseTree(items, answers);
    const group = tree[0]?.item ?? [];
    expect(group.map((node) => node.linkId)).toEqual(["weight", "followup"]);
  });
});

describe("missingRequired", () => {
  const items: QuestionnaireItem[] = [
    { linkId: "weight", type: "quantity", required: true },
    {
      linkId: "hidden",
      type: "text",
      required: true,
      enableWhen: [{ question: "weight", operator: "=", answerInteger: 999 }],
    },
  ];

  it("flags an unanswered required question", () => {
    expect(missingRequired(items, {})).toContain("weight");
  });

  it("ignores a required question hidden by enableWhen", () => {
    const answers: AnswerMap = { weight: { valueQuantity: { value: 72 } } };
    expect(missingRequired(items, answers)).toEqual([]);
  });
});
