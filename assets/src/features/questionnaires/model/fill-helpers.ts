import type {
  Answer,
  QuestionnaireItem,
  ResponseItem,
} from "@/features/questionnaires/model/questionnaire-schemas";
import { isAnswerable } from "@/features/questionnaires/model/questionnaire-schemas";

/** Flat map of linkId → the single answer captured for that question. */
export type AnswerMap = Record<string, Answer | undefined>;

function hasValue(answer: Answer | undefined): boolean {
  if (!answer) {
    return false;
  }
  return Object.values(answer).some(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

/** A condition's expected answer value, normalized for comparison. */
function conditionValue(condition: {
  answerBoolean?: boolean | null;
  answerString?: string | null;
  answerInteger?: number | null;
  answerDecimal?: number | null;
  answerDate?: string | null;
}): unknown {
  return (
    condition.answerBoolean ??
    condition.answerString ??
    condition.answerInteger ??
    condition.answerDecimal ??
    condition.answerDate ??
    null
  );
}

/** The captured answer's value, normalized for comparison. */
function answerValue(answer: Answer | undefined): unknown {
  if (!answer) {
    return null;
  }
  return (
    answer.valueBoolean ??
    answer.valueString ??
    answer.valueInteger ??
    answer.valueDecimal ??
    answer.valueDate ??
    answer.valueDateTime ??
    answer.valueQuantity?.value ??
    answer.valueCoding?.code ??
    null
  );
}

/** Whether an item is shown, given the current answers and its `enableWhen` rules. */
export function isEnabled(item: QuestionnaireItem, answers: AnswerMap): boolean {
  const conditions = item.enableWhen ?? [];
  if (conditions.length === 0) {
    return true;
  }

  const results = conditions.map((condition) => {
    const answer = answers[condition.question];
    if (condition.operator === "exists") {
      return hasValue(answer) === (condition.answerBoolean ?? true);
    }
    const left = answerValue(answer);
    const right = conditionValue(condition);
    switch (condition.operator) {
      case "=":
        return left === right;
      case "!=":
        return left !== right;
      case ">":
        return Number(left) > Number(right);
      case "<":
        return Number(left) < Number(right);
      case ">=":
        return Number(left) >= Number(right);
      case "<=":
        return Number(left) <= Number(right);
      default:
        return true;
    }
  });

  // FHIR `enableBehavior`: all conditions, or any. Default to `all`.
  return item.enableBehavior === "any" ? results.some(Boolean) : results.every(Boolean);
}

/**
 * Build the self-describing response tree from the captured answers, including only
 * enabled items (so an answer to a since-hidden question is dropped). The server re-stamps
 * `text` from the definition, so it is omitted here.
 */
export function buildResponseTree(items: QuestionnaireItem[], answers: AnswerMap): ResponseItem[] {
  const result: ResponseItem[] = [];

  for (const item of items) {
    if (!isEnabled(item, answers)) {
      continue;
    }

    if (item.type === "group") {
      const children = buildResponseTree(item.item ?? [], answers);
      if (children.length > 0) {
        result.push({ linkId: item.linkId, item: children });
      }
      continue;
    }

    if (isAnswerable(item.type)) {
      const answer = answers[item.linkId];
      if (hasValue(answer) && answer) {
        result.push({ linkId: item.linkId, answer: [answer] });
      }
    }
  }

  return result;
}

/** linkIds of enabled, required questions that have no answer (must block submit). */
export function missingRequired(items: QuestionnaireItem[], answers: AnswerMap): string[] {
  const missing: string[] = [];

  const visit = (nodes: QuestionnaireItem[]) => {
    for (const node of nodes) {
      if (!isEnabled(node, answers)) {
        continue;
      }
      if (node.type === "group") {
        visit(node.item ?? []);
        continue;
      }
      if (isAnswerable(node.type) && node.required && !hasValue(answers[node.linkId])) {
        missing.push(node.linkId);
      }
    }
  };

  visit(items);
  return missing;
}
