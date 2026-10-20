import { format, parseISO } from "date-fns";
import { Clock, MailCheck } from "lucide-react";

import type { QuestionnaireLink } from "@/features/questionnaires/api/questionnaire-requests-api";
import * as m from "@/paraglide/messages";
import { ShareLinkResult } from "@/shared/ui/share-link-result";
import { getDateLocale } from "@/shared/utils/date-locale";

interface QuestionnaireLinkResultProps {
  link: QuestionnaireLink;
  /** Set when the link replaced an earlier one, which no longer works. */
  replaced?: boolean;
}

/** A questionnaire link with its delivery and expiry notes. */
export function QuestionnaireLinkResult({ link, replaced = false }: QuestionnaireLinkResultProps) {
  const title = link.questionnaireTitle || m.questionnaire_untitled();

  return (
    <ShareLinkResult
      url={link.url}
      label={m.questionnaire_link_label()}
      shareTitle={title}
      shareText={m.questionnaire_link_share_text({ title })}
      data-testid="questionnaire-link-input"
    >
      {link.emailSent ? (
        <li className="flex items-start gap-2">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>{m.questionnaire_link_email_sent()}</span>
        </li>
      ) : null}
      {link.expiresAt ? (
        <li className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {m.questionnaire_link_expires({
              date: format(parseISO(link.expiresAt), "PPp", { locale: getDateLocale() }),
            })}
          </span>
        </li>
      ) : null}
      {replaced ? (
        <li className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{m.questionnaire_link_replaced()}</span>
        </li>
      ) : null}
    </ShareLinkResult>
  );
}
