import type {
  Answer,
  EnableWhen,
  QuestionnaireItem,
  ResponseItem,
} from "@/features/questionnaires/model/questionnaire-schemas";
import { isAnswerable } from "@/features/questionnaires/model/questionnaire-schemas";

/**
 * Flat map of linkId → the answers captured for that question. FHIR models
 * `QuestionnaireResponse.answer` as a list; most questions hold one entry, questions
 * with `repeats` may hold several.
 */
export type AnswerMap = Record<string, Answer[] | undefined>;

function hasValue(answer: Answer | undefined): boolean {
  if (!answer) {
    return false;
  }
  return Object.values(answer).some(
    (value) => value !== null && value !== undefined && value !== "",
  );
}

/** Whether the question has at least one non-empty answer. */
function isAnswered(answers: Answer[] | undefined): boolean {
  return (answers ?? []).some(hasValue);
}

/** A condition's expected answer value, normalized for comparison. */
function conditionValue(condition: EnableWhen): unknown {
  return (
    condition.answerBoolean ??
    condition.answerString ??
    condition.answerInteger ??
    condition.answerDecimal ??
    condition.answerDate ??
    condition.answerCoding?.code ??
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

/** Whether one captured answer satisfies a comparison condition. */
function matches(answer: Answer, condition: EnableWhen): boolean {
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
}

/** Whether an item is shown, given the current answers and its `enableWhen` rules. */
export function isEnabled(item: QuestionnaireItem, answers: AnswerMap): boolean {
  const conditions = item.enableWhen ?? [];
  if (conditions.length === 0) {
    return true;
  }

  const results = conditions.map((condition) => {
    const captured = (answers[condition.question] ?? []).filter(hasValue);
    if (condition.operator === "exists") {
      return captured.length > 0 === (condition.answerBoolean ?? true);
    }
    // FHIR: a comparison condition is met when *any* captured answer satisfies it.
    return captured.some((answer) => matches(answer, condition));
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
      const captured = (answers[item.linkId] ?? []).filter(hasValue);
      if (captured.length > 0) {
        result.push({ linkId: item.linkId, answer: captured });
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
      if (isAnswerable(node.type) && node.required && !isAnswered(answers[node.linkId])) {
        missing.push(node.linkId);
      }
    }
  };

  visit(items);
  return missing;
}
