import type { Answer, ResponseItem } from "@/features/questionnaires/model/questionnaire-schemas";
import * as m from "@/paraglide/messages";

/** One answer as a display string. Exactly one `value[x]` is set per FHIR. */
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
    return <p className="pt-2 text-sm font-medium">{item.text}</p>;
  }
  return null;
}

/** Read-only question/answer list for a recorded response. */
export function ResponseAnswers({
  items,
  depth = 0,
}: Readonly<{ items: ResponseItem[]; depth?: number }>) {
  return (
    <>
      {items.map((item, index) => {
        const children = item.item ?? [];
        const className = depth > 0 ? "border-border/60 border-l-2 pl-3" : undefined;
        return (
          <div key={`${item.linkId}-${index}`} className={className}>
            <RowBody item={item} />
            {children.length > 0 ? <ResponseAnswers items={children} depth={depth + 1} /> : null}
          </div>
        );
      })}
    </>
  );
}
