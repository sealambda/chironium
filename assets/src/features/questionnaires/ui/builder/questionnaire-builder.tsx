import { ChevronDown, ChevronUp, Circle, Copy, Plus, Square, Trash2 } from "lucide-react";
import { type Dispatch, useEffect, useRef, useState } from "react";

import {
  type BuilderAction,
  type BuilderState,
  emptyAnswerOption,
} from "@/features/questionnaires/model/builder-reducer";
import {
  findMeasurement,
  MEASUREMENT_CONCEPTS,
  measurementOf,
  measurementPatch,
  patchForKind,
  type QuestionKind,
  questionKindOf,
} from "@/features/questionnaires/model/measurements";
import type {
  AnswerOption,
  QuestionnaireItem,
} from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

/** The three kinds a question can be, in dropdown order. */
const KIND_OPTIONS: { value: QuestionKind; label: () => string }[] = [
  { value: "text", label: () => m.questionnaire_type_text() },
  { value: "coding", label: () => m.questionnaire_type_coding() },
  { value: "measurement", label: () => m.questionnaire_type_measurement() },
];

/**
 * Google-Forms-style options editor: each row is prefixed with the glyph the patient
 * will see (radio circle for single choice, square for multiple), placeholders are
 * numbered, and Enter inserts the next option and moves focus into it.
 */
function AnswerOptionsEditor({
  item,
  dispatch,
}: Readonly<{ item: QuestionnaireItem; dispatch: Dispatch<BuilderAction> }>) {
  const options = item.answerOption ?? [];
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (pendingFocus !== null) {
      inputRefs.current[pendingFocus]?.focus();
      setPendingFocus(null);
    }
  }, [pendingFocus]);

  const update = (next: AnswerOption[]) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: { answerOption: next } });

  const insertAt = (index: number) => {
    const next = [...options];
    next.splice(index, 0, emptyAnswerOption());
    update(next);
    setPendingFocus(index);
  };

  const Glyph = item.repeats ? Square : Circle;

  return (
    <div className="space-y-1">
      <FieldLabel>{m.questionnaire_options_label()}</FieldLabel>
      {options.map((option, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: editable option list with no stable id
        <div key={`${item.linkId}-opt-${index}`} className="flex items-center gap-2">
          <Glyph className="size-4 shrink-0 text-muted-foreground/60" />
          <Input
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            value={option.valueString ?? ""}
            placeholder={m.questionnaire_option_n({ number: index + 1 })}
            onChange={(e) => {
              const next = [...options];
              next[index] = { valueString: e.target.value };
              update(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                insertAt(index + 1);
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.common_delete()}
            onClick={() => update(options.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-0 py-1.5 text-left hover:bg-muted/50"
        onClick={() => insertAt(options.length)}
      >
        <Glyph className="size-4 shrink-0 text-muted-foreground/30" />
        <span className="text-sm text-muted-foreground">{m.questionnaire_add_option()}</span>
      </button>
    </div>
  );
}

/**
 * Which measurement the answer is recorded as. A closed list, not a terminology search:
 * only these concepts reach the patient's cards (see `measurements.ts`).
 */
function MeasurementPicker({
  item,
  dispatch,
}: Readonly<{ item: QuestionnaireItem; dispatch: Dispatch<BuilderAction> }>) {
  const selected = measurementOf(item);
  const items = MEASUREMENT_CONCEPTS.map((concept) => ({
    value: concept.id,
    label: concept.label(),
  }));

  return (
    <Field>
      <FieldLabel>{m.questionnaire_measurement_label()}</FieldLabel>
      <Select
        value={selected?.id ?? ""}
        onValueChange={(v) => {
          const concept = findMeasurement(v ?? "");
          if (concept) {
            dispatch({
              type: "updateItem",
              linkId: item.linkId,
              patch: measurementPatch(concept),
            });
          }
        }}
        items={items}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={m.questionnaire_choose_placeholder()} />
        </SelectTrigger>
        <SelectPositioner>
          <SelectContent>
            {MEASUREMENT_CONCEPTS.map((concept) => (
              <SelectItem key={concept.id} value={concept.id}>
                {concept.label()}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectPositioner>
      </Select>
      <p className="text-xs text-muted-foreground">{m.questionnaire_measurement_hint()}</p>
    </Field>
  );
}

function ItemEditor({
  item,
  focusLinkId,
  dispatch,
}: Readonly<{
  item: QuestionnaireItem;
  focusLinkId: string | null | undefined;
  dispatch: Dispatch<BuilderAction>;
}>) {
  const patch = (changes: Partial<QuestionnaireItem>) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: changes });

  const kind = questionKindOf(item);

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={item.text ?? ""}
          placeholder={m.questionnaire_question_placeholder()}
          autoFocus={item.linkId === focusLinkId}
          onChange={(e) => patch({ text: e.target.value })}
          className="order-last w-full sm:order-0 sm:w-auto sm:flex-1"
        />
        <Select
          value={kind}
          onValueChange={(v) => patch(patchForKind((v ?? "text") as QuestionKind))}
          items={KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label() }))}
        >
          <SelectTrigger className="w-32 shrink-0 sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner>
            <SelectContent>
              {KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label()}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPositioner>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.questionnaire_move_up()}
            onClick={() => dispatch({ type: "moveItem", linkId: item.linkId, direction: -1 })}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.questionnaire_move_down()}
            onClick={() => dispatch({ type: "moveItem", linkId: item.linkId, direction: 1 })}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.questionnaire_duplicate()}
            onClick={() => dispatch({ type: "duplicateItem", linkId: item.linkId })}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.common_delete()}
            onClick={() => dispatch({ type: "removeItem", linkId: item.linkId })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {kind === "coding" ? (
        <div className="mt-3 space-y-3">
          <AnswerOptionsEditor item={item} dispatch={dispatch} />
          <label htmlFor={`${item.linkId}-repeats`} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={`${item.linkId}-repeats`}
              checked={item.repeats ?? false}
              onCheckedChange={(checked) => patch({ repeats: checked === true })}
            />
            {m.questionnaire_repeats()}
          </label>
        </div>
      ) : null}

      {kind === "measurement" ? (
        <div className="mt-3">
          <MeasurementPicker item={item} dispatch={dispatch} />
        </div>
      ) : null}
    </div>
  );
}

/** New questions start as free text; the dropdown converts them to options or a measurement. */
function AddQuestionButton({ dispatch }: Readonly<{ dispatch: Dispatch<BuilderAction> }>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => dispatch({ type: "addItem", itemType: "text" })}
    >
      <Plus className="size-4" />
      {m.questionnaire_add_question()}
    </Button>
  );
}

export function QuestionnaireBuilder({
  state,
  dispatch,
}: Readonly<{
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
}>) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel>{m.questionnaire_title_label()}</FieldLabel>
          <Input
            value={state.title}
            placeholder={m.questionnaire_title_placeholder()}
            onChange={(e) => dispatch({ type: "setMeta", patch: { title: e.target.value } })}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>{m.questionnaire_description_label()}</FieldLabel>
          <Textarea
            value={state.description}
            placeholder={m.questionnaire_description_placeholder()}
            onChange={(e) => dispatch({ type: "setMeta", patch: { description: e.target.value } })}
          />
        </Field>
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="questionnaire-ready" className="flex items-center gap-2 text-sm">
            <Checkbox
              id="questionnaire-ready"
              checked={state.status === "ACTIVE"}
              onCheckedChange={(checked) =>
                dispatch({
                  type: "setMeta",
                  patch: { status: checked === true ? "ACTIVE" : "DRAFT" },
                })
              }
            />
            {m.questionnaire_ready()}
          </label>
          <p className="text-xs text-muted-foreground">{m.questionnaire_ready_hint()}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">{m.questionnaire_items_heading()}</h2>
        {state.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            {m.questionnaire_builder_empty()}
          </div>
        ) : null}
        {state.items.map((item) => (
          <ItemEditor
            key={item.linkId}
            item={item}
            focusLinkId={state.focusLinkId}
            dispatch={dispatch}
          />
        ))}
        <AddQuestionButton dispatch={dispatch} />
      </div>
    </div>
  );
}
