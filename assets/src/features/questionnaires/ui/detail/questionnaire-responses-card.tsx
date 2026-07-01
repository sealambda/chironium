import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ClipboardList } from "lucide-react";
import { useState } from "react";

import {
  fetchResponsesByPatient,
  parseAnswers,
  type QuestionnaireResponseRecord,
} from "@/features/questionnaires/api/questionnaire-responses-api";
import type { Answer, ResponseItem } from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { getDateLocale } from "@/shared/utils/date-locale";
import { patientResponsesQueryKey } from "@/shared/utils/query-keys";

function formatAnswer(answer: Answer): string {
  if (answer.valueBoolean != null) {
    return answer.valueBoolean ? m.common_yes() : m.common_no();
  }
  if (answer.valueQuantity?.value != null) {
    const unit = answer.valueQuantity.unit ?? answer.valueQuantity.code ?? "";
    return `${answer.valueQuantity.value} ${unit}`.trim();
  }
  if (answer.valueDecimal != null) {
    return String(answer.valueDecimal);
  }
  if (answer.valueInteger != null) {
    return String(answer.valueInteger);
  }
  if (answer.valueDate) {
    return answer.valueDate;
  }
  if (answer.valueDateTime) {
    return answer.valueDateTime.slice(0, 10);
  }
  if (answer.valueCoding) {
    return answer.valueCoding.display ?? answer.valueCoding.code;
  }
  return answer.valueString ?? "";
}

function RowBody({ item }: Readonly<{ item: ResponseItem }>) {
  const answers = item.answer ?? [];
  if (answers.length > 0) {
    return (
      <div className="flex justify-between gap-3 py-1 text-sm">
        <span className="text-muted-foreground">{item.text || item.linkId}</span>
        <span className="text-right font-medium">
          {answers.map(formatAnswer).filter(Boolean).join(", ")}
        </span>
      </div>
    );
  }
  if (item.text) {
    return <p className="pt-2 font-medium text-sm">{item.text}</p>;
  }
  return null;
}

function AnswerRows({ items, depth = 0 }: Readonly<{ items: ResponseItem[]; depth?: number }>) {
  return (
    <>
      {items.map((item, index) => {
        const children = item.item ?? [];
        const className = depth > 0 ? "border-border/60 border-l-2 pl-3" : undefined;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: read-only list, linkId may repeat
          <div key={`${item.linkId}-${index}`} className={className}>
            <RowBody item={item} />
            {children.length > 0 ? <AnswerRows items={children} depth={depth + 1} /> : null}
          </div>
        );
      })}
    </>
  );
}

function ResponseDetailDialog({
  response,
  open,
  onOpenChange,
}: Readonly<{
  response: QuestionnaireResponseRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  if (!response) {
    return null;
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{response.questionnaire.title || m.questionnaire_untitled()}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <AnswerRows items={parseAnswers(response.item)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionnaireResponsesCard({
  patientId,
  organizationId,
}: Readonly<{ patientId: string | null; organizationId: string }>) {
  const [selected, setSelected] = useState<QuestionnaireResponseRecord | null>(null);

  const { data: responses } = useQuery({
    queryKey: patientResponsesQueryKey(organizationId, patientId ?? ""),
    queryFn: () => fetchResponsesByPatient(patientId ?? "", organizationId),
    enabled: Boolean(organizationId) && Boolean(patientId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-muted-foreground" />
          {m.questionnaire_responses_title()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {responses && responses.length > 0 ? (
          <ul className="space-y-2">
            {responses.map((response) => (
              <li key={response.id}>
                <button
                  type="button"
                  onClick={() => setSelected(response)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="min-w-0 truncate">
                    {response.questionnaire.title || m.questionnaire_untitled()}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {response.authored ? (
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNowStrict(new Date(response.authored), {
                          addSuffix: true,
                          locale: getDateLocale(),
                        })}
                      </span>
                    ) : null}
                    <Badge variant="secondary">{m.questionnaire_responses_completed()}</Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">{m.questionnaire_responses_empty()}</p>
        )}
      </CardContent>

      <ResponseDetailDialog
        response={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
      />
    </Card>
  );
}
