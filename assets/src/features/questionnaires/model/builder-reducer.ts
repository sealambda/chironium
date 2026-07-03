import type { QuestionnaireStatus } from "@/features/questionnaires/api/questionnaires-api";
import {
  type AnswerOption,
  type EnableWhen,
  type ItemType,
  isAnswerable,
  type QuestionnaireItem,
} from "@/features/questionnaires/model/questionnaire-schemas";

/**
 * Controlled state + reducer for the questionnaire builder. The recursive item tree is
 * kept here (rather than in TanStack Form field arrays, which the codebase doesn't use for
 * nested arrays) and validated with zod on save.
 */
export interface BuilderState {
  title: string;
  status: QuestionnaireStatus;
  version: string;
  description: string;
  items: QuestionnaireItem[];
  /** Monotonic counter backing stable, unique linkIds. */
  counter: number;
  /** linkId of the item that should grab keyboard focus (just added or duplicated). */
  focusLinkId?: string | null;
}

export type BuilderAction =
  | { type: "init"; state: BuilderState }
  | {
      type: "setMeta";
      patch: Partial<Pick<BuilderState, "title" | "status" | "version" | "description">>;
    }
  | { type: "addItem"; parentLinkId: string | null; itemType: ItemType }
  | { type: "updateItem"; linkId: string; patch: Partial<QuestionnaireItem> }
  | { type: "removeItem"; linkId: string }
  | { type: "duplicateItem"; linkId: string }
  | { type: "moveItem"; linkId: string; direction: -1 | 1 };

export function emptyBuilderState(): BuilderState {
  return { title: "", status: "DRAFT", version: "", description: "", items: [], counter: 1 };
}

/** Seed the builder from a loaded definition, continuing linkId numbering safely. */
export function builderStateFrom(
  loaded: Pick<BuilderState, "title" | "status" | "version" | "description" | "items">,
): BuilderState {
  return { ...loaded, counter: nextCounter(loaded.items) };
}

function nextCounter(items: QuestionnaireItem[]): number {
  let max = 0;
  const visit = (nodes: QuestionnaireItem[]) => {
    for (const node of nodes) {
      const n = Number.parseInt(node.linkId.replace(/^q/, ""), 10);
      if (Number.isFinite(n)) {
        max = Math.max(max, n);
      }
      if (node.item) {
        visit(node.item);
      }
    }
  };
  visit(items);
  return max + 1;
}

function newItem(linkId: string, itemType: ItemType): QuestionnaireItem {
  return { linkId, type: itemType, text: "" };
}

// Recursively replace the node matching `linkId` with `fn(node)`.
function mapNode(
  items: QuestionnaireItem[],
  linkId: string,
  fn: (node: QuestionnaireItem) => QuestionnaireItem,
): QuestionnaireItem[] {
  return items.map((node) => {
    if (node.linkId === linkId) {
      return fn(node);
    }
    if (node.item) {
      return { ...node, item: mapNode(node.item, linkId, fn) };
    }
    return node;
  });
}

function removeNode(items: QuestionnaireItem[], linkId: string): QuestionnaireItem[] {
  return items
    .filter((node) => node.linkId !== linkId)
    .map((node) => (node.item ? { ...node, item: removeNode(node.item, linkId) } : node));
}

/** All linkIds in the subtree rooted at `linkId` (the node itself plus descendants). */
function subtreeLinkIds(items: QuestionnaireItem[], linkId: string): Set<string> {
  const ids = new Set<string>();
  const collect = (node: QuestionnaireItem) => {
    ids.add(node.linkId);
    for (const child of node.item ?? []) {
      collect(child);
    }
  };
  const find = (nodes: QuestionnaireItem[]) => {
    for (const node of nodes) {
      if (node.linkId === linkId) {
        collect(node);
        return;
      }
      if (node.item) {
        find(node.item);
      }
    }
  };
  find(items);
  return ids;
}

/** Drop `enableWhen` conditions that reference any of the removed linkIds. */
function stripDanglingConditions(
  items: QuestionnaireItem[],
  removed: Set<string>,
): QuestionnaireItem[] {
  return items.map((node) => {
    const conditions = (node.enableWhen ?? []).filter(
      (condition) => !removed.has(condition.question),
    );
    return {
      ...node,
      enableWhen: conditions.length > 0 ? conditions : undefined,
      item: node.item ? stripDanglingConditions(node.item, removed) : node.item,
    };
  });
}

/** Drop properties that no longer apply after an item's type changed. */
function sanitizeForType(node: QuestionnaireItem): QuestionnaireItem {
  const next = { ...node };
  if (next.type !== "coding") {
    next.answerOption = undefined;
    next.answerConstraint = undefined;
  } else if (!next.answerOption || next.answerOption.length === 0) {
    // Google-Forms-style: switching to Options starts with one blank option ready to type.
    next.answerOption = [emptyAnswerOption()];
  }
  if (next.type !== "quantity") {
    next.unit = undefined;
  }
  if (next.type !== "integer" && next.type !== "decimal") {
    next.minValue = undefined;
    next.maxValue = undefined;
  }
  if (!isAnswerable(next.type)) {
    next.required = undefined;
    next.repeats = undefined;
    next.code = undefined;
  }
  if (next.type !== "group") {
    next.item = undefined;
  }
  return next;
}

function insertChild(
  items: QuestionnaireItem[],
  parentLinkId: string | null,
  child: QuestionnaireItem,
): QuestionnaireItem[] {
  if (parentLinkId === null) {
    return [...items, child];
  }
  return mapNode(items, parentLinkId, (node) => ({
    ...node,
    item: [...(node.item ?? []), child],
  }));
}

// Reorder a node among its own siblings (the array that directly contains it).
function moveNode(
  items: QuestionnaireItem[],
  linkId: string,
  direction: -1 | 1,
): QuestionnaireItem[] {
  const index = items.findIndex((node) => node.linkId === linkId);
  if (index !== -1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) {
      return items;
    }
    const next = [...items];
    const moved = next[index];
    const displaced = next[target];
    if (moved && displaced) {
      next[index] = displaced;
      next[target] = moved;
    }
    return next;
  }
  return items.map((node) =>
    node.item ? { ...node, item: moveNode(node.item, linkId, direction) } : node,
  );
}

/**
 * Insert a deep copy of the node right after the original, giving every copied node a
 * fresh linkId and remapping `enableWhen` references *within* the copied subtree (a
 * condition on an outside question stays pointed at the original).
 */
function duplicateNode(
  items: QuestionnaireItem[],
  linkId: string,
  counter: number,
): { items: QuestionnaireItem[]; counter: number; copiedLinkId: string | null } {
  let runningCounter = counter;
  let copiedLinkId: string | null = null;
  const idMap = new Map<string, string>();

  const copy = (node: QuestionnaireItem): QuestionnaireItem => {
    const newId = `q${runningCounter}`;
    runningCounter += 1;
    idMap.set(node.linkId, newId);
    return { ...node, linkId: newId, item: node.item?.map(copy) };
  };

  const remap = (node: QuestionnaireItem): QuestionnaireItem => ({
    ...node,
    enableWhen: node.enableWhen?.map((condition) =>
      idMap.has(condition.question)
        ? { ...condition, question: idMap.get(condition.question) ?? condition.question }
        : condition,
    ),
    item: node.item?.map(remap),
  });

  const insert = (nodes: QuestionnaireItem[]): QuestionnaireItem[] => {
    const index = nodes.findIndex((node) => node.linkId === linkId);
    if (index !== -1) {
      const original = nodes[index];
      if (!original) {
        return nodes;
      }
      const duplicated = remap(copy(original));
      copiedLinkId = duplicated.linkId;
      return [...nodes.slice(0, index + 1), duplicated, ...nodes.slice(index + 1)];
    }
    return nodes.map((node) => (node.item ? { ...node, item: insert(node.item) } : node));
  };

  return { items: insert(items), counter: runningCounter, copiedLinkId };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "init":
      return action.state;

    case "setMeta":
      return { ...state, ...action.patch };

    case "addItem": {
      const linkId = `q${state.counter}`;
      return {
        ...state,
        counter: state.counter + 1,
        items: insertChild(state.items, action.parentLinkId, newItem(linkId, action.itemType)),
        focusLinkId: linkId,
      };
    }

    case "updateItem":
      return {
        ...state,
        focusLinkId: null,
        items: mapNode(state.items, action.linkId, (node) => {
          const next = { ...node, ...action.patch };
          return action.patch.type && action.patch.type !== node.type
            ? sanitizeForType(next)
            : next;
        }),
      };

    case "removeItem": {
      // Deleting a question must also delete conditions that point at it (or at
      // anything inside it), or the definition would no longer validate.
      const removed = subtreeLinkIds(state.items, action.linkId);
      return {
        ...state,
        focusLinkId: null,
        items: stripDanglingConditions(removeNode(state.items, action.linkId), removed),
      };
    }

    case "duplicateItem": {
      const { items, counter, copiedLinkId } = duplicateNode(
        state.items,
        action.linkId,
        state.counter,
      );
      return { ...state, items, counter, focusLinkId: copiedLinkId };
    }

    case "moveItem":
      return {
        ...state,
        focusLinkId: null,
        items: moveNode(state.items, action.linkId, action.direction),
      };

    default:
      return state;
  }
}

// ─── Pre-save authoring checks ───────────────────────────────────────

function someItem(
  items: QuestionnaireItem[],
  predicate: (node: QuestionnaireItem) => boolean,
): boolean {
  return items.some((node) => predicate(node) || someItem(node.item ?? [], predicate));
}

function optionFilled(option: AnswerOption): boolean {
  return Boolean(
    option.valueCoding ||
      option.valueInteger != null ||
      option.valueDate ||
      (option.valueString ?? "").trim() !== "",
  );
}

/** Strip blank answer options before save — the editor keeps an empty row ready to type. */
export function pruneEmptyOptions(items: QuestionnaireItem[]): QuestionnaireItem[] {
  return items.map((node) => {
    const options = node.answerOption?.filter(optionFilled);
    return {
      ...node,
      answerOption: options && options.length > 0 ? options : undefined,
      item: node.item ? pruneEmptyOptions(node.item) : node.item,
    };
  });
}

/** An Options question left with no (filled) choices — nothing to pick when filling. */
export function hasOptionlessChoices(items: QuestionnaireItem[]): boolean {
  return someItem(
    items,
    (node) => node.type === "coding" && !(node.answerOption ?? []).some(optionFilled),
  );
}

/** A comparison condition whose value was never filled in (the server rejects these). */
export function hasIncompleteConditions(items: QuestionnaireItem[]): boolean {
  return someItem(items, (node) =>
    (node.enableWhen ?? []).some(
      (condition) =>
        condition.question === "" ||
        (condition.operator !== "exists" &&
          condition.answerBoolean == null &&
          condition.answerString == null &&
          condition.answerInteger == null &&
          condition.answerDecimal == null &&
          condition.answerDate == null &&
          condition.answerCoding == null),
    ),
  );
}

/** Scale bounds that would be rejected by the server (min must be below max). */
export function hasInvalidScaleBounds(items: QuestionnaireItem[]): boolean {
  return someItem(
    items,
    (node) => node.minValue != null && node.maxValue != null && node.minValue >= node.maxValue,
  );
}

/**
 * Whether the definition uses features beyond the simple authoring surface (free text /
 * options). The builder starts in advanced mode for these so no configuration is hidden.
 */
export function needsAdvancedAuthoring(items: QuestionnaireItem[]): boolean {
  const simpleTypes: string[] = ["text", "string", "coding"];
  return someItem(
    items,
    (node) =>
      !simpleTypes.includes(node.type) ||
      (node.enableWhen ?? []).length > 0 ||
      (node.code ?? []).length > 0 ||
      node.required === true ||
      node.minValue != null ||
      node.maxValue != null ||
      node.unit != null,
  );
}

// ─── Small helpers for the item editor ───────────────────────────────

export function emptyAnswerOption(): AnswerOption {
  return { valueString: "" };
}

export function emptyEnableWhen(question: string): EnableWhen {
  return { question, operator: "exists", answerBoolean: true };
}

/**
 * The answerable questions that precede `linkId` in a depth-first walk — the valid
 * `enableWhen` sources. Groups and display items cannot be answered, so they are skipped.
 */
export function precedingQuestions(
  items: QuestionnaireItem[],
  linkId: string,
): QuestionnaireItem[] {
  const result: QuestionnaireItem[] = [];
  let found = false;
  const visit = (nodes: QuestionnaireItem[]) => {
    for (const node of nodes) {
      if (node.linkId === linkId) {
        found = true;
        return;
      }
      if (isAnswerable(node.type)) {
        result.push(node);
      }
      if (node.item) {
        visit(node.item);
        if (found) {
          return;
        }
      }
    }
  };
  visit(items);
  return result;
}
