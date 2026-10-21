import type { ReactNode } from "react";

import { type AnswerMap, isEnabled } from "@/features/questionnaires/model/fill-helpers";
import type {
  Answer,
  AnswerOption,
  QuestionnaireItem,
} from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";
import { Checkbox } from "@/shared/ui/checkbox";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
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
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

const BOOLEAN_YES = "yes";
const BOOLEAN_NO = "no";

/** Whether an integer question renders as a tappable rating scale (e.g. pain 1–10). */
export function isScale(item: QuestionnaireItem): boolean {
  return (
    item.type === "integer" &&
    item.minValue != null &&
    item.maxValue != null &&
    item.maxValue - item.minValue >= 1 &&
    item.maxValue - item.minValue <= 11
  );
}

function scaleValues(item: QuestionnaireItem): number[] {
  const min = item.minValue ?? 0;
  const max = item.maxValue ?? 0;
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function numberAnswer(item: QuestionnaireItem, raw: string): Answer | undefined {
  if (raw.trim() === "") {
    return undefined;
  }
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  if (item.type === "integer") {
    return { valueInteger: Math.round(value) };
  }
  if (item.type === "quantity") {
    return {
      valueQuantity: {
        value,
        unit: item.unit?.display ?? item.unit?.code ?? null,
        system: item.unit?.system ?? null,
        code: item.unit?.code ?? null,
      },
    };
  }
  return { valueDecimal: value };
}

interface FieldProps {
  item: QuestionnaireItem;
  answer: Answer | undefined;
  onChange: (answer: Answer | undefined) => void;
}

function LabeledField({
  item,
  showMissing,
  children,
}: Readonly<{ item: QuestionnaireItem; showMissing?: boolean; children: ReactNode }>) {
  return (
    <Field data-invalid={showMissing || undefined}>
      <FieldLabel>
        {item.text || item.linkId}
        {item.required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </FieldLabel>
      {children}
      {showMissing ? <FieldError>{m.questionnaire_fill_missing()}</FieldError> : null}
    </Field>
  );
}

function booleanSelectValue(answer: Answer | undefined): string {
  if (answer?.valueBoolean === true) {
    return BOOLEAN_YES;
  }
  if (answer?.valueBoolean === false) {
    return BOOLEAN_NO;
  }
  return "";
}

function BooleanField({ answer, onChange }: Readonly<Omit<FieldProps, "item">>) {
  return (
    <ToggleGroup
      value={booleanSelectValue(answer)}
      onValueChange={(v) => onChange(v ? { valueBoolean: v === BOOLEAN_YES } : undefined)}
    >
      <ToggleGroupItem value={BOOLEAN_YES}>{m.common_yes()}</ToggleGroupItem>
      <ToggleGroupItem value={BOOLEAN_NO}>{m.common_no()}</ToggleGroupItem>
    </ToggleGroup>
  );
}

/** A tappable 1–10 style rating row for bounded integer questions. */
function ScaleField({ item, answer, onChange }: Readonly<FieldProps>) {
  const current = answer?.valueInteger != null ? String(answer.valueInteger) : "";
  return (
    <ToggleGroup
      value={current}
      onValueChange={(v) => onChange(v === "" ? undefined : { valueInteger: Number(v) })}
    >
      {scaleValues(item).map((value) => (
        <ToggleGroupItem key={value} value={String(value)} className="min-w-0 px-1">
          {value}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function NumberField({ item, answer, onChange }: Readonly<FieldProps>) {
  const raw =
    answer?.valueDecimal?.toString() ??
    answer?.valueInteger?.toString() ??
    answer?.valueQuantity?.value?.toString() ??
    "";
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={item.minValue ?? undefined}
        max={item.maxValue ?? undefined}
        value={raw}
        onChange={(e) => onChange(numberAnswer(item, e.target.value))}
      />
      {item.unit?.display ? (
        <span className="text-sm text-muted-foreground">{item.unit.display}</span>
      ) : null}
    </div>
  );
}

function optionKey(option: AnswerOption): string {
  if (option.valueCoding) {
    return `${option.valueCoding.system}|${option.valueCoding.code}`;
  }
  return option.valueString ?? String(option.valueInteger ?? option.valueDate ?? "");
}

function optionLabel(option: AnswerOption): string {
  return (
    option.valueCoding?.display ??
    option.valueCoding?.code ??
    option.valueString ??
    String(option.valueInteger ?? option.valueDate ?? "")
  );
}

function optionAnswer(option: AnswerOption): Answer {
  if (option.valueCoding) {
    return { valueCoding: option.valueCoding };
  }
  if (option.valueInteger != null) {
    return { valueInteger: option.valueInteger };
  }
  if (option.valueDate) {
    return { valueDate: option.valueDate };
  }
  return { valueString: option.valueString ?? "" };
}

function answerKey(answer: Answer): string {
  if (answer.valueCoding) {
    return `${answer.valueCoding.system}|${answer.valueCoding.code}`;
  }
  return answer.valueString ?? String(answer.valueInteger ?? answer.valueDate ?? "");
}

/** Multi-select checkbox list for `coding` questions with `repeats`. */
function MultiChoiceField({
  item,
  answers,
  onChange,
}: Readonly<{
  item: QuestionnaireItem;
  answers: Answer[];
  onChange: (answers: Answer[]) => void;
}>) {
  const selected = new Set(answers.map(answerKey));
  return (
    <div className="flex flex-col gap-2">
      {(item.answerOption ?? []).map((option) => {
        const key = optionKey(option);
        const id = `${item.linkId}-${key}`;
        const checked = selected.has(key);
        return (
          <label key={key} htmlFor={id} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(next) =>
                onChange(
                  next === true
                    ? [...answers, optionAnswer(option)]
                    : answers.filter((answer) => answerKey(answer) !== key),
                )
              }
            />
            {optionLabel(option)}
          </label>
        );
      })}
    </div>
  );
}

/** Single-select dropdown for `coding` questions. */
function ChoiceField({ item, answer, onChange }: Readonly<FieldProps>) {
  const options = (item.answerOption ?? []).map((option) => ({
    value: optionKey(option),
    label: optionLabel(option),
    option,
  }));
  const current = answer ? answerKey(answer) : "";
  return (
    <Select
      value={current}
      onValueChange={(v) => {
        const match = options.find((o) => o.value === v);
        onChange(match ? optionAnswer(match.option) : undefined);
      }}
      items={options}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={m.questionnaire_choose_placeholder()} />
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

/** Renders the input for a single answerable question, dispatching on its type. */
function FillField({ item, answer, onChange }: Readonly<FieldProps>) {
  switch (item.type) {
    case "boolean":
      return <BooleanField answer={answer} onChange={onChange} />;

    case "integer":
      return isScale(item) ? (
        <ScaleField item={item} answer={answer} onChange={onChange} />
      ) : (
        <NumberField item={item} answer={answer} onChange={onChange} />
      );

    case "decimal":
    case "quantity":
      return <NumberField item={item} answer={answer} onChange={onChange} />;

    case "date":
      return (
        <DatePickerString
          value={answer?.valueDate ?? ""}
          onChange={(v) => onChange(v ? { valueDate: v } : undefined)}
        />
      );

    case "dateTime":
      return (
        <DatePickerString
          value={answer?.valueDateTime?.slice(0, 10) ?? ""}
          onChange={(v) => onChange(v ? { valueDateTime: v } : undefined)}
        />
      );

    case "text":
      return (
        <Textarea
          value={answer?.valueString ?? ""}
          onChange={(e) => onChange(e.target.value ? { valueString: e.target.value } : undefined)}
        />
      );

    case "coding":
      return <ChoiceField item={item} answer={answer} onChange={onChange} />;

    default:
      return (
        <Input
          value={answer?.valueString ?? ""}
          onChange={(e) => onChange(e.target.value ? { valueString: e.target.value } : undefined)}
        />
      );
  }
}

export interface FillItemsProps {
  items: QuestionnaireItem[];
  answers: AnswerMap;
  onChange: (linkId: string, answers: Answer[] | undefined) => void;
  /** linkIds of required questions to flag after a failed submit. */
  missing?: ReadonlySet<string>;
}

/** Recursively renders the questionnaire as a form, hiding items failing `enableWhen`. */
export function FillItems({ items, answers, onChange, missing }: Readonly<FillItemsProps>) {
  return (
    <>
      {items.map((item) => {
        if (!isEnabled(item, answers)) {
          return null;
        }
        if (item.type === "group") {
          return (
            <div key={item.linkId} className="space-y-3">
              {item.text ? <p className="text-sm font-medium">{item.text}</p> : null}
              <div className="space-y-3 border-l-2 border-border/60 pl-3">
                <FillItems
                  items={item.item ?? []}
                  answers={answers}
                  onChange={onChange}
                  missing={missing}
                />
              </div>
            </div>
          );
        }
        if (item.type === "display") {
          return (
            <p key={item.linkId} className="text-sm text-muted-foreground">
              {item.text}
            </p>
          );
        }
        const captured = answers[item.linkId] ?? [];
        const showMissing = missing?.has(item.linkId) ?? false;

        if (item.type === "coding" && item.repeats) {
          return (
            <LabeledField key={item.linkId} item={item} showMissing={showMissing}>
              <MultiChoiceField
                item={item}
                answers={captured}
                onChange={(next) => onChange(item.linkId, next.length > 0 ? next : undefined)}
              />
            </LabeledField>
          );
        }
        return (
          <LabeledField key={item.linkId} item={item} showMissing={showMissing}>
            <FillField
              item={item}
              answer={captured[0]}
              onChange={(answer) => onChange(item.linkId, answer ? [answer] : undefined)}
            />
          </LabeledField>
        );
      })}
    </>
  );
}
