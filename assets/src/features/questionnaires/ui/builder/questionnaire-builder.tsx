import {
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Plus,
  SlidersHorizontal,
  Square,
  Trash2,
} from "lucide-react";
import { type Dispatch, useEffect, useRef, useState } from "react";

import type { QuestionnaireStatus } from "@/features/questionnaires/api/questionnaires-api";
import {
  type BuilderAction,
  type BuilderState,
  emptyAnswerOption,
  emptyEnableWhen,
  needsAdvancedAuthoring,
  precedingQuestions,
} from "@/features/questionnaires/model/builder-reducer";
import {
  type AnswerOption,
  type Coding,
  type EnableOperator,
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
import { DatePickerString } from "@/shared/ui/date-picker";
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

/** The default authoring surface: a question is free text or a set of options. */
const SIMPLE_ITEM_TYPES: ItemType[] = ["text", "coding"];

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
        <span className="text-muted-foreground text-sm">{m.questionnaire_add_option()}</span>
      </button>
    </div>
  );
}

/**
 * A comparison choice in the condition editor: either an `exists` polarity ("is
 * answered" / "is not answered") or a value operator. `exists` conditions carry their
 * polarity in `answerBoolean`, so the two concepts collapse into one dropdown.
 */
type ComparisonKey = "answered" | "not_answered" | Exclude<EnableOperator, "exists">;

function comparisonOf(condition: EnableWhen): ComparisonKey {
  if (condition.operator === "exists") {
    return condition.answerBoolean === false ? "not_answered" : "answered";
  }
  return condition.operator;
}

function comparisonLabel(key: ComparisonKey): string {
  switch (key) {
    case "answered":
      return m.questionnaire_op_answered();
    case "not_answered":
      return m.questionnaire_op_not_answered();
    case "=":
      return m.questionnaire_op_equals();
    case "!=":
      return m.questionnaire_op_not_equals();
    case ">":
      return ">";
    case "<":
      return "<";
    case ">=":
      return "≥";
    case "<=":
      return "≤";
    default:
      return key;
  }
}

/** The comparisons that make sense for a given source question type. */
function comparisonsFor(source: QuestionnaireItem | undefined): ComparisonKey[] {
  const base: ComparisonKey[] = ["answered", "not_answered", "=", "!="];
  if (!source) {
    return base;
  }
  switch (source.type) {
    case "boolean":
      return ["answered", "not_answered", "="];
    case "integer":
    case "decimal":
    case "quantity":
    case "date":
    case "dateTime":
      return [...base, ">", "<", ">=", "<="];
    default:
      return base;
  }
}

/** Rebuild a condition for a newly picked comparison, preserving the value if possible. */
function withComparison(condition: EnableWhen, key: ComparisonKey): EnableWhen {
  if (key === "answered" || key === "not_answered") {
    return { question: condition.question, operator: "exists", answerBoolean: key === "answered" };
  }
  const { question } = condition;
  const previous =
    condition.operator === "exists"
      ? {}
      : {
          answerBoolean: condition.answerBoolean,
          answerString: condition.answerString,
          answerInteger: condition.answerInteger,
          answerDecimal: condition.answerDecimal,
          answerDate: condition.answerDate,
          answerCoding: condition.answerCoding,
        };
  return { question, operator: key, ...previous };
}

/** The value input for a comparison condition, typed by the source question. */
function ConditionValueInput({
  condition,
  source,
  onChange,
}: Readonly<{
  condition: EnableWhen;
  source: QuestionnaireItem | undefined;
  onChange: (patch: Partial<EnableWhen>) => void;
}>) {
  // Setting one answer[x] must clear the others — FHIR allows exactly one.
  const setValue = (patch: Partial<EnableWhen>) =>
    onChange({
      answerBoolean: undefined,
      answerString: undefined,
      answerInteger: undefined,
      answerDecimal: undefined,
      answerDate: undefined,
      answerCoding: undefined,
      ...patch,
    });

  switch (source?.type) {
    case "boolean":
      return (
        <Select
          value={condition.answerBoolean == null ? "" : String(condition.answerBoolean)}
          onValueChange={(v) => setValue({ answerBoolean: v === "true" })}
          items={[
            { value: "true", label: m.common_yes() },
            { value: "false", label: m.common_no() },
          ]}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder={m.questionnaire_enablewhen_value()} />
          </SelectTrigger>
          <SelectPositioner>
            <SelectContent>
              <SelectItem value="true">{m.common_yes()}</SelectItem>
              <SelectItem value="false">{m.common_no()}</SelectItem>
            </SelectContent>
          </SelectPositioner>
        </Select>
      );

    case "coding": {
      type ConditionOption = { value: string; label: string; coding: Coding | null };
      const options = (source.answerOption ?? []).flatMap<ConditionOption>((option) => {
        if (option.valueCoding) {
          return [
            {
              value: option.valueCoding.code,
              label: option.valueCoding.display ?? option.valueCoding.code,
              coding: option.valueCoding,
            },
          ];
        }
        if (option.valueString) {
          return [{ value: option.valueString, label: option.valueString, coding: null }];
        }
        return [];
      });
      const current = condition.answerCoding?.code ?? condition.answerString ?? "";
      return (
        <Select
          value={current}
          onValueChange={(v) => {
            const match = options.find((o) => o.value === v);
            setValue(match?.coding ? { answerCoding: match.coding } : { answerString: v ?? "" });
          }}
          items={options}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={m.questionnaire_enablewhen_value()} />
          </SelectTrigger>
          <SelectPositioner>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPositioner>
        </Select>
      );
    }

    case "integer":
      return (
        <Input
          type="number"
          className="w-24"
          value={condition.answerInteger ?? ""}
          placeholder={m.questionnaire_enablewhen_value()}
          onChange={(e) => {
            const parsed = Number.parseInt(e.target.value, 10);
            setValue({ answerInteger: Number.isFinite(parsed) ? parsed : undefined });
          }}
        />
      );

    case "decimal":
    case "quantity":
      return (
        <Input
          type="number"
          className="w-24"
          value={condition.answerDecimal ?? ""}
          placeholder={m.questionnaire_enablewhen_value()}
          onChange={(e) => {
            const parsed = Number.parseFloat(e.target.value);
            setValue({ answerDecimal: Number.isFinite(parsed) ? parsed : undefined });
          }}
        />
      );

    case "date":
    case "dateTime":
      return (
        <DatePickerString
          value={condition.answerDate ?? ""}
          onChange={(v) => setValue({ answerDate: v || undefined })}
        />
      );

    default:
      return (
        <Input
          className="w-40"
          value={condition.answerString ?? ""}
          placeholder={m.questionnaire_enablewhen_value()}
          onChange={(e) => setValue({ answerString: e.target.value || undefined })}
        />
      );
  }
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
  const sources = precedingQuestions(allItems, item.linkId);

  const update = (next: EnableWhen[]) =>
    dispatch({
      type: "updateItem",
      linkId: item.linkId,
      patch: { enableWhen: next.length > 0 ? next : undefined },
    });

  if (sources.length === 0 && conditions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <FieldLabel>{m.questionnaire_enablewhen_label()}</FieldLabel>
      {conditions.map((condition, index) => {
        const source = sources.find((s) => s.linkId === condition.question);
        const comparison = comparisonOf(condition);
        const patchCondition = (patch: Partial<EnableWhen>) => {
          const next = [...conditions];
          next[index] = { ...condition, ...patch };
          update(next);
        };
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: editable condition list with no stable id
          <div key={`${item.linkId}-ew-${index}`} className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {m.questionnaire_enablewhen_when()}
            </span>
            <Select
              value={condition.question}
              onValueChange={(v) => {
                const nextSource = sources.find((s) => s.linkId === v);
                const next = [...conditions];
                // Changing the source question resets the comparison — the old
                // value type most likely no longer applies.
                next[index] = emptyEnableWhen(nextSource?.linkId ?? "");
                update(next);
              }}
              items={sources.map((s) => ({ value: s.linkId, label: s.text || s.linkId }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={m.questionnaire_enablewhen_question()} />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.linkId} value={s.linkId}>
                      {s.text || s.linkId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
            <Select
              value={comparison}
              onValueChange={(v) => {
                const next = [...conditions];
                next[index] = withComparison(condition, (v ?? "answered") as ComparisonKey);
                update(next);
              }}
              items={comparisonsFor(source).map((key) => ({
                value: key,
                label: comparisonLabel(key),
              }))}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {comparisonsFor(source).map((key) => (
                    <SelectItem key={key} value={key}>
                      {comparisonLabel(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
            {condition.operator !== "exists" ? (
              <ConditionValueInput
                condition={condition}
                source={source}
                onChange={patchCondition}
              />
            ) : null}
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
        );
      })}
      {sources.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => update([...conditions, emptyEnableWhen(sources[0]?.linkId ?? "")])}
        >
          <Plus className="size-4" />
          {m.questionnaire_add_enablewhen()}
        </Button>
      ) : null}
    </div>
  );
}

/** Optional numeric bounds for integer questions; when both are set, a rating scale. */
function ScaleBoundsEditor({
  item,
  dispatch,
}: Readonly<{ item: QuestionnaireItem; dispatch: Dispatch<BuilderAction> }>) {
  const patch = (changes: Partial<QuestionnaireItem>) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: changes });

  const parse = (raw: string): number | undefined => {
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : undefined;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <FieldLabel className="mb-0">{m.questionnaire_scale_label()}</FieldLabel>
        <Input
          type="number"
          className="w-20"
          value={item.minValue ?? ""}
          placeholder="1"
          aria-label={m.questionnaire_scale_from()}
          onChange={(e) => patch({ minValue: parse(e.target.value) })}
        />
        <span className="text-muted-foreground text-sm">{m.questionnaire_scale_to()}</span>
        <Input
          type="number"
          className="w-20"
          value={item.maxValue ?? ""}
          placeholder="10"
          aria-label={m.questionnaire_scale_to()}
          onChange={(e) => patch({ maxValue: parse(e.target.value) })}
        />
      </div>
      <p className="text-muted-foreground text-xs">{m.questionnaire_scale_hint()}</p>
    </div>
  );
}

/** Unit for `quantity` questions, stored as a UCUM coding. */
function UnitEditor({
  item,
  dispatch,
}: Readonly<{ item: QuestionnaireItem; dispatch: Dispatch<BuilderAction> }>) {
  return (
    <div className="flex items-center gap-2">
      <FieldLabel className="mb-0">{m.questionnaire_unit_label()}</FieldLabel>
      <Input
        className="w-28"
        value={item.unit?.code ?? ""}
        placeholder={m.questionnaire_unit_placeholder()}
        onChange={(e) => {
          const code = e.target.value.trim();
          dispatch({
            type: "updateItem",
            linkId: item.linkId,
            patch: {
              unit: code ? { system: "http://unitsofmeasure.org", code, display: code } : undefined,
            },
          });
        }}
      />
    </div>
  );
}

/**
 * The per-question settings below the header row. Simple mode only exposes the options
 * editor (for `coding` questions); advanced mode adds required, clinical code, scale
 * bounds, unit, and visibility conditions. FHIR allows `enableWhen` on any item, so
 * groups and display texts get the condition editor too (e.g. a conditional section).
 */
function ItemExtras({
  item,
  allItems,
  organizationId,
  advanced,
  dispatch,
}: Readonly<{
  item: QuestionnaireItem;
  allItems: QuestionnaireItem[];
  organizationId: string;
  advanced: boolean;
  dispatch: Dispatch<BuilderAction>;
}>) {
  const patch = (changes: Partial<QuestionnaireItem>) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: changes });

  if (!isAnswerable(item.type)) {
    return advanced ? (
      <div className="mt-3">
        <EnableWhenEditor item={item} allItems={allItems} dispatch={dispatch} />
      </div>
    ) : null;
  }
  if (item.type !== "coding" && !advanced) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {item.type === "coding" ? (
        <>
          <AnswerOptionsEditor item={item} dispatch={dispatch} />
          <label htmlFor={`${item.linkId}-repeats`} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={`${item.linkId}-repeats`}
              checked={item.repeats ?? false}
              onCheckedChange={(checked) => patch({ repeats: checked === true })}
            />
            {m.questionnaire_repeats()}
          </label>
        </>
      ) : null}

      {advanced ? (
        <>
          <label htmlFor={`${item.linkId}-required`} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={`${item.linkId}-required`}
              checked={item.required ?? false}
              onCheckedChange={(checked) => patch({ required: checked === true })}
            />
            {m.questionnaire_required()}
          </label>

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

          {item.type === "integer" ? <ScaleBoundsEditor item={item} dispatch={dispatch} /> : null}
          {item.type === "quantity" ? <UnitEditor item={item} dispatch={dispatch} /> : null}

          <EnableWhenEditor item={item} allItems={allItems} dispatch={dispatch} />
        </>
      ) : null}
    </div>
  );
}

function ItemEditor({
  item,
  allItems,
  organizationId,
  advanced,
  focusLinkId,
  dispatch,
  depth,
}: Readonly<{
  item: QuestionnaireItem;
  allItems: QuestionnaireItem[];
  organizationId: string;
  advanced: boolean;
  focusLinkId: string | null | undefined;
  dispatch: Dispatch<BuilderAction>;
  depth: number;
}>) {
  const patch = (changes: Partial<QuestionnaireItem>) =>
    dispatch({ type: "updateItem", linkId: item.linkId, patch: changes });

  const isGroup = item.type === "group";

  // Simple mode offers free text / options only; the current type is always listed so an
  // advanced questionnaire still reads correctly when viewed in simple mode.
  const availableTypes = advanced ? ITEM_TYPES : SIMPLE_ITEM_TYPES;
  const typeChoices = availableTypes.includes(item.type)
    ? availableTypes
    : [item.type, ...availableTypes];

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          value={item.text ?? ""}
          placeholder={
            isGroup ? m.questionnaire_section_placeholder() : m.questionnaire_question_placeholder()
          }
          autoFocus={item.linkId === focusLinkId}
          onChange={(e) => patch({ text: e.target.value })}
          className={isGroup ? "flex-1 font-medium" : "flex-1"}
        />
        <Select
          value={item.type}
          onValueChange={(v) => patch({ type: (v ?? "text") as ItemType })}
          items={typeChoices.map((t) => ({ value: t, label: typeLabel(t) }))}
        >
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner>
            <SelectContent>
              {typeChoices.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPositioner>
        </Select>
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

      <ItemExtras
        item={item}
        allItems={allItems}
        organizationId={organizationId}
        advanced={advanced}
        dispatch={dispatch}
      />

      {isGroup ? (
        <div className="mt-3 space-y-2 border-border/60 border-l-2 pl-3">
          {(item.item ?? []).map((child) => (
            <ItemEditor
              key={child.linkId}
              item={child}
              allItems={allItems}
              organizationId={organizationId}
              advanced={advanced}
              focusLinkId={focusLinkId}
              dispatch={dispatch}
              depth={depth + 1}
            />
          ))}
          <AddQuestionButton parentLinkId={item.linkId} dispatch={dispatch} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One single "add" affordance: new items start as free-text questions; the type
 * dropdown converts them (to options, or — in advanced mode — sections, scales, …).
 */
function AddQuestionButton({
  parentLinkId,
  dispatch,
}: Readonly<{ parentLinkId: string | null; dispatch: Dispatch<BuilderAction> }>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => dispatch({ type: "addItem", parentLinkId, itemType: "text" })}
    >
      <Plus className="size-4" />
      {m.questionnaire_add_question()}
    </Button>
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
  // Progressive disclosure: the default surface is title + description + free-text/options
  // questions. The advanced surface adds statuses, versions, more answer types, sections,
  // conditions, and clinical codes — and switches on automatically when the loaded
  // questionnaire already uses any of them.
  const [advancedManual, setAdvancedManual] = useState<boolean | null>(null);
  const advanced =
    advancedManual ??
    (needsAdvancedAuthoring(state.items) ||
      state.status === "RETIRED" ||
      state.version.trim() !== "");

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
        {advanced ? (
          <>
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
          </>
        ) : (
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
            <p className="text-muted-foreground text-xs">{m.questionnaire_ready_hint()}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium text-sm">{m.questionnaire_items_heading()}</h2>
          <Button
            type="button"
            variant={advanced ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={advanced}
            onClick={() => setAdvancedManual(!advanced)}
          >
            <SlidersHorizontal className="size-4" />
            {m.questionnaire_advanced()}
          </Button>
        </div>
        {state.items.length === 0 ? (
          <div className="rounded-lg border border-border/60 border-dashed p-6 text-center text-muted-foreground text-sm">
            {m.questionnaire_builder_empty()}
          </div>
        ) : null}
        {state.items.map((item) => (
          <ItemEditor
            key={item.linkId}
            item={item}
            allItems={state.items}
            organizationId={organizationId}
            advanced={advanced}
            focusLinkId={state.focusLinkId}
            dispatch={dispatch}
            depth={0}
          />
        ))}
        <AddQuestionButton parentLinkId={null} dispatch={dispatch} />
      </div>
    </div>
  );
}
