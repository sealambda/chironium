import {
  parseAnswers,
  type QuestionnaireResponseRecord,
} from "@/features/questionnaires/api/questionnaire-responses-api";
import { ResponseAnswers } from "@/features/questionnaires/ui/detail/response-answers";
import * as m from "@/paraglide/messages";

interface QuestionnaireEventProps {
  response: QuestionnaireResponseRecord;
}

/** Timeline body for a questionnaire response: its title and the recorded answers. */
export function QuestionnaireEvent({ response }: Readonly<QuestionnaireEventProps>) {
  const answers = parseAnswers(response.item);

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-3 py-2">
      <p className="text-sm font-medium text-foreground">
        {response.questionnaire?.title || m.questionnaire_untitled()}
      </p>
      {answers.length > 0 ? <ResponseAnswers items={answers} /> : null}
    </div>
  );
}
