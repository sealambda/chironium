import type { QuestionnaireStatus } from "@/features/questionnaires/api/questionnaires-api";
import type {
  AnswerOption,
  EnableWhen,
  ItemType,
  QuestionnaireItem,
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
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return items.map((node) =>
    node.item ? { ...node, item: moveNode(node.item, linkId, direction) } : node,
  );
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
      };
    }

    case "updateItem":
      return {
        ...state,
        items: mapNode(state.items, action.linkId, (node) => ({ ...node, ...action.patch })),
      };

    case "removeItem":
      return { ...state, items: removeNode(state.items, action.linkId) };

    case "moveItem":
      return { ...state, items: moveNode(state.items, action.linkId, action.direction) };

    default:
      return state;
  }
}

// ─── Small helpers for the item editor ───────────────────────────────

export function emptyAnswerOption(): AnswerOption {
  return { valueString: "" };
}

export function emptyEnableWhen(question: string): EnableWhen {
  return { question, operator: "exists", answerBoolean: true };
}

/** All linkIds that precede `linkId` in a depth-first walk — valid `enableWhen` sources. */
export function precedingLinkIds(
  items: QuestionnaireItem[],
  linkId: string,
): { linkId: string; text: string }[] {
  const result: { linkId: string; text: string }[] = [];
  let found = false;
  const visit = (nodes: QuestionnaireItem[]) => {
    for (const node of nodes) {
      if (node.linkId === linkId) {
        found = true;
        return;
      }
      result.push({ linkId: node.linkId, text: node.text || node.linkId });
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
