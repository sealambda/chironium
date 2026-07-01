import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import { submitResponse } from "@/features/questionnaires/api/questionnaire-responses-api";
import {
  fetchQuestionnaire,
  fetchQuestionnaires,
} from "@/features/questionnaires/api/questionnaires-api";
import {
  type AnswerMap,
  buildResponseTree,
  isEnabled,
  missingRequired,
} from "@/features/questionnaires/model/fill-helpers";
import type {
  Answer,
  QuestionnaireItem,
} from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DatePickerString } from "@/shared/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Loading } from "@/shared/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { patientResponsesQueryKey, questionnairesQueryKeys } from "@/shared/utils/query-keys";

interface FillDialogProps {
  personId: string;
  patientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BOOLEAN_UNSET = "";
const BOOLEAN_YES = "yes";
const BOOLEAN_NO = "no";

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
  children,
}: Readonly<{ item: QuestionnaireItem; children: ReactNode }>) {
  return (
    <Field>
      <FieldLabel>
        {item.text || item.linkId}
        {item.required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </FieldLabel>
      {children}
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
  return BOOLEAN_UNSET;
}

function booleanAnswer(value: string): Answer | undefined {
  if (value === BOOLEAN_YES) {
    return { valueBoolean: true };
  }
  if (value === BOOLEAN_NO) {
    return { valueBoolean: false };
  }
  return undefined;
}

/** Renders a single-select dropdown for either booleans or `coding` answer options. */
function ChoiceField({
  item,
  value,
  options,
  onSelect,
}: Readonly<{
  item: QuestionnaireItem;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}>) {
  return (
    <LabeledField item={item}>
      <Select value={value} onValueChange={(v) => onSelect(v ?? "")} items={options}>
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
    </LabeledField>
  );
}

function NumberField({ item, answer, onChange }: Readonly<FieldProps>) {
  const raw =
    answer?.valueDecimal?.toString() ??
    answer?.valueInteger?.toString() ??
    answer?.valueQuantity?.value?.toString() ??
    "";
  return (
    <LabeledField item={item}>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={raw}
          onChange={(e) => onChange(numberAnswer(item, e.target.value))}
        />
        {item.unit?.display ? (
          <span className="text-muted-foreground text-sm">{item.unit.display}</span>
        ) : null}
      </div>
    </LabeledField>
  );
}

/** Renders the input for a single answerable question, dispatching on its type. */
function FillField({ item, answer, onChange }: Readonly<FieldProps>) {
  switch (item.type) {
    case "boolean":
      return (
        <ChoiceField
          item={item}
          value={booleanSelectValue(answer)}
          options={[
            { value: BOOLEAN_YES, label: m.common_yes() },
            { value: BOOLEAN_NO, label: m.common_no() },
          ]}
          onSelect={(v) => onChange(booleanAnswer(v))}
        />
      );

    case "decimal":
    case "integer":
    case "quantity":
      return <NumberField item={item} answer={answer} onChange={onChange} />;

    case "date":
      return (
        <LabeledField item={item}>
          <DatePickerString
            value={answer?.valueDate ?? ""}
            onChange={(v) => onChange(v ? { valueDate: v } : undefined)}
          />
        </LabeledField>
      );

    case "dateTime":
      return (
        <LabeledField item={item}>
          <DatePickerString
            value={answer?.valueDateTime?.slice(0, 10) ?? ""}
            onChange={(v) => onChange(v ? { valueDateTime: v } : undefined)}
          />
        </LabeledField>
      );

    case "text":
      return (
        <LabeledField item={item}>
          <Textarea
            value={answer?.valueString ?? ""}
            onChange={(e) => onChange(e.target.value ? { valueString: e.target.value } : undefined)}
          />
        </LabeledField>
      );

    case "coding": {
      const options = (item.answerOption ?? [])
        .map((option) => option.valueString)
        .filter((value): value is string => Boolean(value))
        .map((o) => ({ value: o, label: o }));
      return (
        <ChoiceField
          item={item}
          value={answer?.valueString ?? ""}
          options={options}
          onSelect={(v) => onChange(v ? { valueString: v } : undefined)}
        />
      );
    }

    default:
      return (
        <LabeledField item={item}>
          <Input
            value={answer?.valueString ?? ""}
            onChange={(e) => onChange(e.target.value ? { valueString: e.target.value } : undefined)}
          />
        </LabeledField>
      );
  }
}

/** Recursively renders the questionnaire as a form, hiding items failing `enableWhen`. */
function FillItems({
  items,
  answers,
  onChange,
}: Readonly<{
  items: QuestionnaireItem[];
  answers: AnswerMap;
  onChange: (linkId: string, answer: Answer | undefined) => void;
}>) {
  return (
    <>
      {items.map((item) => {
        if (!isEnabled(item, answers)) {
          return null;
        }
        if (item.type === "group") {
          return (
            <div key={item.linkId} className="space-y-3">
              {item.text ? <p className="font-medium text-sm">{item.text}</p> : null}
              <div className="space-y-3 border-border/60 border-l-2 pl-3">
                <FillItems items={item.item ?? []} answers={answers} onChange={onChange} />
              </div>
            </div>
          );
        }
        if (item.type === "display") {
          return (
            <p key={item.linkId} className="text-muted-foreground text-sm">
              {item.text}
            </p>
          );
        }
        return (
          <FillField
            key={item.linkId}
            item={item}
            answer={answers[item.linkId]}
            onChange={(answer) => onChange(item.linkId, answer)}
          />
        );
      })}
    </>
  );
}

export function QuestionnaireFillDialog({
  personId,
  patientId,
  open,
  onOpenChange,
}: Readonly<FillDialogProps>) {
  const { selectedOrg } = useOrg();
  const orgId = selectedOrg?.id;
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [saving, setSaving] = useState(false);

  // Reset when the dialog reopens.
  useEffect(() => {
    if (open) {
      setSelectedId("");
      setAnswers({});
    }
  }, [open]);

  const { data: questionnaires } = useQuery({
    queryKey: questionnairesQueryKeys.list(orgId ?? ""),
    queryFn: () => fetchQuestionnaires(orgId ?? ""),
    enabled: open && Boolean(orgId),
  });

  const activeQuestionnaires = useMemo(
    () => (questionnaires ?? []).filter((q) => q.status === "ACTIVE"),
    [questionnaires],
  );

  const { data: selected, isLoading: loadingDetail } = useQuery({
    queryKey: questionnairesQueryKeys.detail(orgId ?? "", selectedId),
    queryFn: () => fetchQuestionnaire(selectedId, orgId ?? ""),
    enabled: open && Boolean(orgId) && selectedId !== "",
  });

  const setAnswer = (linkId: string, answer: Answer | undefined) =>
    setAnswers((current) => ({ ...current, [linkId]: answer }));

  const handleSubmit = async () => {
    if (!orgId || !patientId || !selected) {
      return;
    }
    const missing = missingRequired(selected.item, answers);
    if (missing.length > 0) {
      toast.error(m.questionnaire_fill_required_error());
      return;
    }

    setSaving(true);
    try {
      const tree = buildResponseTree(selected.item, answers);
      await submitResponse(selected.id, patientId, tree, orgId);
      await queryClient.invalidateQueries({
        queryKey: patientResponsesQueryKey(orgId, patientId),
      });
      // Extraction may create observations, so refresh the patient detail too.
      await invalidatePersonDetail(queryClient, personId);
      toast.success(m.questionnaire_fill_success());
      onOpenChange(false);
    } catch {
      toast.error(m.questionnaire_fill_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{m.questionnaire_fill_title()}</DialogTitle>
          <DialogDescription>{m.questionnaire_fill_subtitle()}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          <Field>
            <FieldLabel>{m.questionnaire_fill_pick()}</FieldLabel>
            <Select
              value={selectedId}
              onValueChange={(v) => setSelectedId(v ?? "")}
              items={activeQuestionnaires.map((q) => ({
                value: q.id,
                label: q.title || m.questionnaire_untitled(),
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={m.questionnaire_fill_pick_placeholder()} />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {activeQuestionnaires.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title || m.questionnaire_untitled()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
          </Field>

          {selectedId && loadingDetail ? <Loading /> : null}

          {selected ? (
            <FillItems items={selected.item} answers={answers} onChange={setAnswer} />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={saving || !selected}>
            {m.questionnaire_fill_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
