import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { Dispatch } from "react";

import type { QuestionnaireStatus } from "@/features/questionnaires/api/questionnaires-api";
import {
  type BuilderAction,
  type BuilderState,
  emptyAnswerOption,
  emptyEnableWhen,
  precedingLinkIds,
} from "@/features/questionnaires/model/builder-reducer";
import {
  type AnswerOption,
  type EnableWhen,
  ITEM_TYPES,
  type ItemType,
  isAnswerable,
  type QuestionnaireItem,
} from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";
import type { TerminologyTag } from "@/shared/types/terminology";
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
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";
import { Textarea } from "@/shared/ui/textarea";

const STATUS_OPTIONS: { value: QuestionnaireStatus; label: () => string }[] = [
  { value: "DRAFT", label: () => m.questionnaire_status_draft() },
  { value: "ACTIVE", label: () => m.questionnaire_status_active() },
  { value: "RETIRED", label: () => m.questionnaire_status_retired() },
];

function typeLabel(type: ItemType): string {
  switch (type) {
    case "group":
      return m.questionnaire_type_group();
    case "display":
      return m.questionnaire_type_display();
    case "boolean":
      return m.questionnaire_type_boolean();
    case "decimal":
      return m.questionnaire_type_decimal();
    case "integer":
      return m.questionnaire_type_integer();
    case "date":
      return m.questionnaire_type_date();
    case "dateTime":
      return m.questionnaire_type_datetime();
    case "string":
      return m.questionnaire_type_string();
    case "text":
      return m.questionnaire_type_text();
    case "coding":
      return m.questionnaire_type_coding();
    case "quantity":
      return m.questionnaire_type_quantity();
    default:
      return type;
  }
}

function codeToTags(item: QuestionnaireItem): TerminologyTag[] {
  return (item.code ?? []).map((coding) => ({
    label: coding.display ?? coding.code,
    coding: { system: coding.system, code: coding.code, display: coding.display ?? coding.code },
  }));
}

function AnswerOptionsEditor({
  item,
  dispatch,
}: Readonly<{ item: QuestionnaireItem; dispatch: Dispatch<BuilderAction> }>) {
  const options = item.answerOption ?? [];

  const update = (next: AnswerOption[]) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: { answerOption: next } });

  return (
    <div className="space-y-2">
      <FieldLabel>{m.questionnaire_options_label()}</FieldLabel>
      {options.map((option, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: editable option list with no stable id
        <div key={`${item.linkId}-opt-${index}`} className="flex items-center gap-2">
          <Input
            value={option.valueString ?? ""}
            placeholder={m.questionnaire_option_placeholder()}
            onChange={(e) => {
              const next = [...options];
              next[index] = { valueString: e.target.value };
              update(next);
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => update([...options, emptyAnswerOption()])}
      >
        <Plus className="size-4" />
        {m.questionnaire_add_option()}
      </Button>
    </div>
  );
}

function EnableWhenEditor({
  item,
  allItems,
  dispatch,
}: Readonly<{
  item: QuestionnaireItem;
  allItems: QuestionnaireItem[];
  dispatch: Dispatch<BuilderAction>;
}>) {
  const conditions = item.enableWhen ?? [];
  const sources = precedingLinkIds(allItems, item.linkId);

  const update = (next: EnableWhen[]) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: { enableWhen: next } });

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <FieldLabel>{m.questionnaire_enablewhen_label()}</FieldLabel>
      {conditions.map((condition, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: editable condition list with no stable id
        <div key={`${item.linkId}-ew-${index}`} className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">{m.questionnaire_enablewhen_when()}</span>
          <Select
            value={condition.question}
            onValueChange={(v) => {
              const next = [...conditions];
              next[index] = { ...condition, question: v ?? "" };
              update(next);
            }}
            items={sources.map((s) => ({ value: s.linkId, label: s.text }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={m.questionnaire_enablewhen_question()} />
            </SelectTrigger>
            <SelectPositioner>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.linkId} value={s.linkId}>
                    {s.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectPositioner>
          </Select>
          <span className="text-muted-foreground text-sm">
            {m.questionnaire_enablewhen_answered()}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.common_delete()}
            onClick={() => update(conditions.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => update([...conditions, emptyEnableWhen(sources[0]?.linkId ?? "")])}
      >
        <Plus className="size-4" />
        {m.questionnaire_add_enablewhen()}
      </Button>
    </div>
  );
}

function ItemEditor({
  item,
  allItems,
  organizationId,
  dispatch,
  depth,
}: Readonly<{
  item: QuestionnaireItem;
  allItems: QuestionnaireItem[];
  organizationId: string;
  dispatch: Dispatch<BuilderAction>;
  depth: number;
}>) {
  const patch = (changes: Partial<QuestionnaireItem>) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: changes });

  const isGroup = item.type === "group";
  const answerable = isAnswerable(item.type);

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2">
        <Select
          value={item.type}
          onValueChange={(v) => patch({ type: (v ?? "string") as ItemType })}
          items={ITEM_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner>
            <SelectContent>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPositioner>
        </Select>
        <Input
          value={item.text ?? ""}
          placeholder={
            isGroup ? m.questionnaire_section_placeholder() : m.questionnaire_question_placeholder()
          }
          onChange={(e) => patch({ text: e.target.value })}
          className="flex-1"
        />
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
          aria-label={m.common_delete()}
          onClick={() => dispatch({ type: "removeItem", linkId: item.linkId })}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {answerable ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label htmlFor={`${item.linkId}-required`} className="flex items-center gap-2 text-sm">
              <Checkbox
                id={`${item.linkId}-required`}
                checked={item.required ?? false}
                onCheckedChange={(checked) => patch({ required: checked === true })}
              />
              {m.questionnaire_required()}
            </label>
            <label htmlFor={`${item.linkId}-repeats`} className="flex items-center gap-2 text-sm">
              <Checkbox
                id={`${item.linkId}-repeats`}
                checked={item.repeats ?? false}
                onCheckedChange={(checked) => patch({ repeats: checked === true })}
              />
              {m.questionnaire_repeats()}
            </label>
          </div>

          <Field>
            <TerminologyTagInput
              label={m.questionnaire_code_label()}
              placeholder={m.questionnaire_code_placeholder()}
              addLabel={m.common_add()}
              tags={codeToTags(item)}
              organizationId={organizationId}
              conceptContext="LAB_RESULT"
              onAdd={(tag) => {
                if (!tag.coding) {
                  return;
                }
                patch({
                  code: [
                    ...(item.code ?? []),
                    {
                      system: tag.coding.system,
                      code: tag.coding.code,
                      display: tag.coding.display ?? tag.label,
                    },
                  ],
                });
              }}
              onRemove={(index) => patch({ code: (item.code ?? []).filter((_, i) => i !== index) })}
            />
          </Field>

          {item.type === "coding" ? <AnswerOptionsEditor item={item} dispatch={dispatch} /> : null}

          <EnableWhenEditor item={item} allItems={allItems} dispatch={dispatch} />
        </div>
      ) : null}

      {isGroup ? (
        <div className="mt-3 space-y-2 border-border/60 border-l-2 pl-3">
          {(item.item ?? []).map((child) => (
            <ItemEditor
              key={child.linkId}
              item={child}
              allItems={allItems}
              organizationId={organizationId}
              dispatch={dispatch}
              depth={depth + 1}
            />
          ))}
          <AddItemControls parentLinkId={item.linkId} dispatch={dispatch} />
        </div>
      ) : null}
    </div>
  );
}

function AddItemControls({
  parentLinkId,
  dispatch,
}: Readonly<{ parentLinkId: string | null; dispatch: Dispatch<BuilderAction> }>) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dispatch({ type: "addItem", parentLinkId, itemType: "string" })}
      >
        <Plus className="size-4" />
        {m.questionnaire_add_question()}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dispatch({ type: "addItem", parentLinkId, itemType: "group" })}
      >
        <Plus className="size-4" />
        {m.questionnaire_add_section()}
      </Button>
    </div>
  );
}

export function QuestionnaireBuilder({
  state,
  dispatch,
  organizationId,
}: Readonly<{
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
  organizationId: string;
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
        <Field>
          <FieldLabel>{m.questionnaire_status_label()}</FieldLabel>
          <Select
            value={state.status}
            onValueChange={(v) =>
              dispatch({
                type: "setMeta",
                patch: { status: (v ?? "DRAFT") as QuestionnaireStatus },
              })
            }
            items={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label() }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectPositioner>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label()}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectPositioner>
          </Select>
        </Field>
        <Field>
          <FieldLabel>{m.questionnaire_version_label()}</FieldLabel>
          <Input
            value={state.version}
            placeholder="1.0"
            onChange={(e) => dispatch({ type: "setMeta", patch: { version: e.target.value } })}
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
      </div>

      <div className="space-y-2">
        <h2 className="font-medium text-sm">{m.questionnaire_items_heading()}</h2>
        {state.items.map((item) => (
          <ItemEditor
            key={item.linkId}
            item={item}
            allItems={state.items}
            organizationId={organizationId}
            dispatch={dispatch}
            depth={0}
          />
        ))}
        <AddItemControls parentLinkId={null} dispatch={dispatch} />
      </div>
    </div>
  );
}
